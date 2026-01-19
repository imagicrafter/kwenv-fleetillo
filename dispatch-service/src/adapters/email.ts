/**
 * Email Channel Adapter
 *
 * Implements the ChannelAdapter interface for sending dispatch messages
 * via email providers (SendGrid or Resend).
 *
 * @module adapters/email
 * @requirements 5.1 - Use configured email provider (SendGrid or Resend) to deliver email
 * @requirements 5.2 - Update channel_dispatch status to 'delivered' and record provider message_id on success
 * @requirements 5.3 - Return failure if driver doesn't have email address configured
 * @requirements 5.4 - Update channel_dispatch status to 'failed' and record error on provider error
 */

import {
  ChannelAdapter,
  DispatchContext,
  ChannelResult,
  HealthStatus,
  ChannelType,
} from './interface.js';
import { Driver } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Supported email providers
 */
export type EmailProvider = 'sendgrid' | 'resend';

/**
 * Resend API response for sending email
 */
interface ResendResponse {
  id?: string;
  message?: string;
  statusCode?: number;
}

/**
 * SendGrid error response
 */
interface SendGridErrorResponse {
  errors?: Array<{ message?: string }>;
}

/**
 * Email configuration
 */
interface EmailConfig {
  provider: EmailProvider;
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

/**
 * Get the configured email provider
 */
export function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER?.toLowerCase();
  if (provider === 'resend') {
    return 'resend';
  }
  return 'sendgrid'; // Default to SendGrid
}

/**
 * Check if email is configured with required environment variables
 */
export function isEmailConfigured(): boolean {
  const provider = getEmailProvider();

  if (provider === 'sendgrid') {
    const apiKey = process.env.SENDGRID_API_KEY;
    return !!apiKey && apiKey.trim().length > 0;
  } else {
    const apiKey = process.env.RESEND_API_KEY;
    return !!apiKey && apiKey.trim().length > 0;
  }
}

/**
 * Get email configuration from environment variables
 */
function getEmailConfig(): EmailConfig | null {
  const provider = getEmailProvider();

  let apiKey: string | undefined;
  if (provider === 'sendgrid') {
    apiKey = process.env.SENDGRID_API_KEY;
  } else {
    apiKey = process.env.RESEND_API_KEY;
  }

  if (!apiKey || apiKey.trim().length === 0) {
    return null;
  }

  return {
    provider,
    apiKey: apiKey.trim(),
    fromEmail: process.env.EMAIL_FROM_ADDRESS || 'dispatch@fleetillo.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Fleetillo Dispatch',
  };
}

/**
 * Send email via SendGrid API
 */
async function sendViaSendGrid(
  config: EmailConfig,
  to: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: to }],
        },
      ],
      from: {
        email: config.fromEmail,
        name: config.fromName,
      },
      subject,
      content: [
        {
          type: 'text/html',
          value: htmlContent,
        },
      ],
    }),
  });

  // SendGrid returns 202 Accepted on success
  if (response.status === 202 || response.status === 200) {
    // Message ID is in x-message-id header
    const messageId = response.headers.get('x-message-id') || undefined;
    return { success: true, messageId };
  }

  // Handle error response
  let errorMessage = `SendGrid API error: ${response.status}`;
  try {
    const errorData = (await response.json()) as SendGridErrorResponse;
    if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
      errorMessage = errorData.errors.map((e) => e.message).join(', ');
    }
  } catch {
    // Ignore JSON parse errors
  }

  return { success: false, error: errorMessage };
}

/**
 * Send email via Resend API
 */
async function sendViaResend(
  config: EmailConfig,
  to: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: [to],
      subject,
      html: htmlContent,
    }),
  });

  const data = (await response.json()) as ResendResponse;

  if (response.ok && data.id) {
    return { success: true, messageId: data.id };
  }

  const errorMessage = data.message || `Resend API error: ${response.status}`;
  return { success: false, error: errorMessage };
}

/**
 * Email Channel Adapter
 *
 * Sends dispatch messages to drivers via email (SendGrid or Resend).
 */
export class EmailAdapter implements ChannelAdapter {
  readonly channelType: ChannelType = 'email';

  /**
   * Check if this adapter can send to the given driver.
   * Returns true if the driver has an email address configured.
   *
   * @param driver - The driver to check
   * @returns true if the driver has a valid email address
   * @requirements 5.3 - Return failure if driver doesn't have email address configured
   */
  canSend(driver: Driver): boolean {
    return !!driver.email && driver.email.trim().length > 0;
  }

  /**
   * Send a dispatch message to the driver via email.
   *
   * @param context - The dispatch context containing all message data
   * @returns A promise resolving to the channel result
   * @requirements 5.1 - Use configured email provider to deliver email
   * @requirements 5.2 - Record provider message_id on success
   * @requirements 5.3 - Return failure if driver doesn't have email address
   * @requirements 5.4 - Record error on provider error
   */
  async send(context: DispatchContext): Promise<ChannelResult> {
    const sentAt = new Date();
    const { driver, dispatch, route, template } = context;

    // Check if driver has email configured
    if (!this.canSend(driver)) {
      logger.warn('Driver does not have email address configured', {
        dispatchId: dispatch.id,
        driverId: driver.id,
        channel: this.channelType,
      });

      return {
        success: false,
        channelType: this.channelType,
        error: 'Driver does not have email address configured',
        sentAt,
      };
    }

    // Get email configuration
    const config = getEmailConfig();
    if (!config) {
      logger.error('Email provider is not configured', {
        dispatchId: dispatch.id,
        channel: this.channelType,
      });

      return {
        success: false,
        channelType: this.channelType,
        error: 'Email provider is not configured',
        sentAt,
      };
    }

    try {
      // Build email subject
      const subject = `Route Assignment: ${route.name} - ${route.date}`;

      // Use template as HTML content
      const htmlContent = template;

      // Send via configured provider
      let result: { success: boolean; messageId?: string; error?: string };

      if (config.provider === 'sendgrid') {
        result = await sendViaSendGrid(config, driver.email!, subject, htmlContent);
      } else {
        result = await sendViaResend(config, driver.email!, subject, htmlContent);
      }

      if (result.success) {
        logger.info('Email sent successfully', {
          dispatchId: dispatch.id,
          driverId: driver.id,
          channel: this.channelType,
          provider: config.provider,
          messageId: result.messageId,
        });

        return {
          success: true,
          channelType: this.channelType,
          providerMessageId: result.messageId,
          sentAt,
        };
      } else {
        logger.error('Email provider returned error', {
          dispatchId: dispatch.id,
          driverId: driver.id,
          channel: this.channelType,
          provider: config.provider,
          error: result.error,
        });

        return {
          success: false,
          channelType: this.channelType,
          error: result.error,
          sentAt,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      logger.error(
        'Failed to send email',
        {
          dispatchId: dispatch.id,
          driverId: driver.id,
          channel: this.channelType,
        },
        error instanceof Error ? error : new Error(errorMessage)
      );

      return {
        success: false,
        channelType: this.channelType,
        error: errorMessage,
        sentAt,
      };
    }
  }

  /**
   * Check the health/connectivity of the email adapter.
   * Verifies that the email provider API is accessible.
   *
   * @returns A promise resolving to the health status
   */
  async healthCheck(): Promise<HealthStatus> {
    const config = getEmailConfig();

    if (!config) {
      return {
        healthy: false,
        message: 'Email provider is not configured',
      };
    }

    try {
      if (config.provider === 'sendgrid') {
        // SendGrid: Check API key validity by calling the user profile endpoint
        const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
          },
        });

        if (response.ok) {
          return {
            healthy: true,
            message: 'SendGrid API connected',
          };
        } else {
          const errorText = response.status === 401
            ? 'Invalid API key'
            : `API error: ${response.status}`;
          return {
            healthy: false,
            message: errorText,
          };
        }
      } else {
        // Resend: Check API key validity by calling the domains endpoint
        const response = await fetch('https://api.resend.com/domains', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
          },
        });

        if (response.ok) {
          return {
            healthy: true,
            message: 'Resend API connected',
          };
        } else {
          const errorText = response.status === 401
            ? 'Invalid API key'
            : `API error: ${response.status}`;
          return {
            healthy: false,
            message: errorText,
          };
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      logger.error(
        'Email health check failed',
        { channel: this.channelType, provider: config.provider },
        error instanceof Error ? error : new Error(errorMessage)
      );

      return {
        healthy: false,
        message: `Health check failed: ${errorMessage}`,
      };
    }
  }
}

// Export singleton instance
export const emailAdapter = new EmailAdapter();
