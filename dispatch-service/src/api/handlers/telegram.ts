/**
 * Telegram Webhook Handler
 *
 * Handles incoming Telegram updates, specifically:
 * - /start commands for driver registration
 * - Automatically links driver's telegram_chat_id when they register
 *
 * @module api/handlers/telegram
 */

import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { logger } from '../../utils/logger.js';
import { getSupabaseClient } from '../../db/supabase.js';

/**
 * Telegram Update object from webhook
 */
interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: 'private' | 'group' | 'supergroup' | 'channel';
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
        type: string;
      };
    };
    data?: string;
  };
}

/**
 * Response for registration link request
 */
export interface RegistrationLinkResponse {
  driverId: string;
  driverName: string;
  registrationLink: string;
  qrCodeUrl: string;
  alreadyRegistered: boolean;
}

/**
 * Get the Telegram bot username from the bot token
 */
async function getBotUsername(): Promise<string | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  // Mock for development/testing
  if (token === 'test-token' || token.startsWith('test-')) {
    return 'FleetFusionBot';
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json() as { ok: boolean; result?: { username?: string } };
    return data.ok ? data.result?.username || null : null;
  } catch {
    return null;
  }
}

/**
 * Update driver's telegram_chat_id in the database
 */
export async function updateDriverTelegramChatId(
  driverId: string,
  chatId: string,
  telegramUsername?: string
): Promise<boolean> {
  const client = getSupabaseClient();

  const { error } = await client
    .from('drivers')
    .update({ telegram_chat_id: chatId })
    .eq('id', driverId)
    .is('deleted_at', null);

  if (error) {
    logger.error('Failed to update driver telegram_chat_id', {
      driverId,
      chatId,
      error: error.message,
    });
    return false;
  }

  logger.info('Driver telegram_chat_id updated successfully', {
    driverId,
    chatId,
    telegramUsername, // Log for reference, but not stored
  });

  return true;
}

/**
 * Get driver by ID to verify existence
 */
export async function getDriverById(driverId: string): Promise<{ id: string; firstName: string; lastName: string; telegramChatId?: string } | null> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('drivers')
    .select('id, first_name, last_name, telegram_chat_id')
    .eq('id', driverId)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    telegramChatId: data.telegram_chat_id || undefined,
  };
}

/**
 * Send a welcome message to the driver via Telegram
 */
async function sendWelcomeMessage(chatId: string, driverName: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const message = `🎉 *Welcome to Fleetillo Dispatch, ${driverName}!*

Your Telegram is now linked to your driver account.

You will receive route assignments and dispatch notifications here.

If you have any questions, please contact your dispatcher.`;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
  } catch (error) {
    logger.error('Failed to send welcome message', { chatId, error });
  }
}

/**
 * Send an error message to the user via Telegram
 */
async function sendErrorMessage(chatId: string, message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
  } catch (error) {
    logger.error('Failed to send error message', { chatId, error });
  }
}

/**
 * Answer a Telegram callback query to stop the loading animation
 */
async function answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text,
      }),
    });
  } catch (error) {
    logger.error('Failed to answer callback query', { error });
  }
}

/**
 * Acknowledge a dispatch in the database
 */
async function acknowledgeDispatch(dispatchId: string, chatId?: string, username?: string): Promise<void> {
  const client = getSupabaseClient();
  const timestamp = new Date().toISOString();

  // Update channel_dispatches status to 'acknowledged'
  const { error } = await client
    .from('channel_dispatches')
    .update({
      status: 'acknowledged',
      updated_at: timestamp,
    })
    .eq('dispatch_id', dispatchId)
    .eq('channel', 'telegram');

  if (error) {
    logger.error('Failed to acknowledge dispatch', { dispatchId, error });
  } else {
    logger.info('Dispatch acknowledged via Telegram', { dispatchId, chatId, username });

    // Also update main dispatch status to 'acknowledged' if not already
    await client
      .from('dispatches')
      .update({ status: 'acknowledged', updated_at: timestamp })
      .eq('id', dispatchId);
  }
}

/**
 * Handle incoming Telegram webhook updates
 *
 * POST /api/v1/telegram/webhook
 *
 * This endpoint receives updates from Telegram when users message the bot.
 * It specifically handles /start commands with driver IDs to link accounts.
 *
 * Format: /start DRIVER_UUID
 */
export function createTelegramWebhookHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    const update: TelegramUpdate = req.body;

    // Always respond 200 OK to Telegram (required by webhook spec)
    res.status(200).json({ ok: true });

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const { id, data, message, from } = update.callback_query;
      const chatId = message?.chat.id.toString();

      logger.debug('Received Telegram callback query', {
        callbackId: id,
        chatId,
        data,
        username: from.username,
      });

      if (data?.startsWith('ack:')) {
        const dispatchId = data.split(':')[1];
        if (dispatchId) {
          await acknowledgeDispatch(dispatchId, chatId, from.username);
          await answerCallbackQuery(id, '✅ Dispatch acknowledged!');

          // Optional: Update the message text to show it's acknowledged?
          // For now, the toast notification ("Dispatch acknowledged!") is enough.
        }
      }
      return;
    }

    // Only process private messages with text
    if (!update.message?.text || update.message.chat.type !== 'private') {
      return;
    }

    const { text, chat, from } = update.message;
    const chatId = chat.id.toString();

    logger.debug('Received Telegram update', {
      updateId: update.update_id,
      chatId,
      text,
      username: from.username,
    });

    // Check if this is a /start command
    if (text.startsWith('/start')) {
      const parts = text.split(' ');

      if (parts.length < 2) {
        // /start without driver ID - show help message
        await sendErrorMessage(
          chatId,
          `👋 *Welcome to Fleetillo Dispatch Bot!*

To link your Telegram account, please use the registration link provided by your dispatcher.

If you received a QR code or link, please scan or click it to register.`
        );
        return;
      }

      const driverId = parts[1] as string; // Safe: we checked parts.length >= 2

      // Validate driver ID format (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(driverId)) {
        await sendErrorMessage(
          chatId,
          `❌ *Invalid registration link*

The registration link appears to be invalid. Please contact your dispatcher.`
        );
        return;
      }

      // Look up the driver
      const driver = await getDriverById(driverId);

      if (!driver) {
        await sendErrorMessage(
          chatId,
          `❌ *Driver not found*

We couldn't find a driver account with this ID. Please contact your dispatcher.`
        );
        return;
      }

      // Check if already registered with this chat ID
      if (driver.telegramChatId === chatId) {
        await sendErrorMessage(
          chatId,
          `✅ *Already registered!*

Your Telegram is already linked to your driver account, ${driver.firstName}. You will receive dispatch notifications here.`
        );
        return;
      }

      // Update the driver's telegram_chat_id
      const success = await updateDriverTelegramChatId(
        driverId,
        chatId,
        from.username
      );

      if (success) {
        await sendWelcomeMessage(chatId, driver.firstName);
        logger.info('Driver Telegram registration successful', {
          driverId,
          chatId,
          driverName: `${driver.firstName} ${driver.lastName}`,
        });
      } else {
        await sendErrorMessage(
          chatId,
          `❌ *Registration failed*

We encountered an error linking your account. Please try again or contact your dispatcher.`
        );
      }
    }
  };
}

/**
 * Generate a registration link for a driver
 *
 * GET /api/v1/telegram/registration/:driverId
 *
 * Returns a registration link and QR code URL for the driver to register their Telegram.
 */
export function createRegistrationLinkHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    const driverId = req.params.driverId as string;

    // Validate driver ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!driverId || !uuidRegex.test(driverId)) {
      res.status(400).json({
        error: {
          code: 'INVALID_DRIVER_ID',
          message: 'Invalid driver ID format',
        },
        requestId: req.correlationId,
      });
      return;
    }

    // Look up the driver
    const driver = await getDriverById(driverId);

    if (!driver) {
      res.status(404).json({
        error: {
          code: 'DRIVER_NOT_FOUND',
          message: 'Driver not found',
        },
        requestId: req.correlationId,
      });
      return;
    }

    // Get bot username
    const botUsername = await getBotUsername();

    if (!botUsername) {
      res.status(503).json({
        error: {
          code: 'TELEGRAM_NOT_CONFIGURED',
          message: 'Telegram bot is not configured',
        },
        requestId: req.correlationId,
      });
      return;
    }

    // Generate registration link
    const registrationLink = `https://t.me/${botUsername}?start=${driverId}`;

    try {
      // Generate QR code data URI
      const qrCodeUrl = await QRCode.toDataURL(registrationLink, {
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      const response: RegistrationLinkResponse = {
        driverId: driver.id,
        driverName: `${driver.firstName} ${driver.lastName}`,
        registrationLink,
        qrCodeUrl,
        alreadyRegistered: !!driver.telegramChatId,
      };

      logger.info('Generated Telegram registration link', {
        driverId,
        driverName: response.driverName,
        alreadyRegistered: response.alreadyRegistered,
      });

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to generate QR code', { driverId, error });
      res.status(500).json({
        error: {
          code: 'QR_CODE_ERROR',
          message: 'Failed to generate QR code',
        },
        requestId: req.correlationId,
      });
    }
  };
}

/**
 * Send registration email to a driver
 *
 * POST /api/v1/telegram/send-registration
 *
 * Sends an email to the driver with their Telegram registration link and QR code.
 */
export function createSendRegistrationEmailHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    const { driverId, customMessage } = req.body as { driverId: string; customMessage?: string };

    // Validate driver ID
    if (!driverId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'driver_id is required',
        },
        requestId: req.correlationId,
      });
      return;
    }

    // Look up the driver
    const client = getSupabaseClient();
    const { data: driver, error } = await client
      .from('drivers')
      .select('id, first_name, last_name, email, telegram_chat_id')
      .eq('id', driverId)
      .is('deleted_at', null)
      .single();

    if (error || !driver) {
      res.status(404).json({
        error: {
          code: 'DRIVER_NOT_FOUND',
          message: 'Driver not found',
        },
        requestId: req.correlationId,
      });
      return;
    }

    if (!driver.email) {
      res.status(400).json({
        error: {
          code: 'NO_EMAIL',
          message: 'Driver does not have an email address configured',
        },
        requestId: req.correlationId,
      });
      return;
    }

    // Store email after validation (TypeScript type narrowing)
    const driverEmail: string = driver.email;

    // Get bot username
    const botUsername = await getBotUsername();

    if (!botUsername) {
      res.status(503).json({
        error: {
          code: 'TELEGRAM_NOT_CONFIGURED',
          message: 'Telegram bot is not configured',
        },
        requestId: req.correlationId,
      });
      return;
    }

    // Generate registration link
    const registrationLink = `https://t.me/${botUsername}?start=${driverId}`;

    // Generate QR code URL using a public API for email client compatibility
    // Data URIs (base64) are often blocked by email clients (Gmail, Outlook)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(registrationLink)}`;

    // Send email using the email adapter
    const emailProvider = process.env.EMAIL_PROVIDER?.toLowerCase() || 'sendgrid';
    const resendKey = process.env.RESEND_API_KEY;
    const sendgridKey = process.env.SENDGRID_API_KEY || process.env.EMAIL_API_KEY;
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'dispatch@fleetillo.com';
    const fromName = process.env.EMAIL_FROM_NAME || 'Fleetillo Dispatch';

    // Check if the appropriate email provider is configured
    const apiKey = emailProvider === 'resend' ? resendKey : sendgridKey;
    if (!apiKey) {
      res.status(503).json({
        error: {
          code: 'EMAIL_NOT_CONFIGURED',
          message: `Email service (${emailProvider}) is not configured`,
        },
        requestId: req.correlationId,
      });
      return;
    }

    // Build email content
    const driverFirstName = driver.first_name;
    const driverFullName = `${driver.first_name} ${driver.last_name}`; // Keep for log or other uses if needed

    // Use first name for friendlier greeting in email
    const htmlContent = buildRegistrationEmailHtml(driverFirstName, registrationLink, qrCodeUrl, customMessage);
    const textContent = buildRegistrationEmailText(driverFirstName, registrationLink, customMessage);

    // Log the email request details for debugging
    console.log('[Email] Sending registration email:', {
      provider: emailProvider,
      from: `${fromName} <${fromAddress}>`,
      to: driverEmail,
      driverId,
    });

    try {
      if (emailProvider === 'resend') {
        // Send via Resend
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${fromName} <${fromAddress}>`,
            to: [driverEmail],
            subject: 'Register Your Telegram for Route Dispatches - Fleetillo',
            html: htmlContent,
            text: textContent,
          }),
        });

        // Read response body for logging
        const responseText = await response.text();
        console.log('[Email] Resend API response:', {
          status: response.status,
          statusText: response.statusText,
          body: responseText,
        });

        if (!response.ok) {
          let errorMessage = `Resend API error (${response.status})`;
          try {
            const errorData = JSON.parse(responseText) as { message?: string; name?: string };
            errorMessage = errorData.message || errorData.name || response.statusText;
          } catch {
            errorMessage = responseText || response.statusText;
          }
          throw new Error(errorMessage);
        }
      } else {
        // Send via SendGrid (default)
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sendgridKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: driverEmail, name: driverFullName }] }],
            from: { email: fromAddress, name: fromName },
            subject: 'Register Your Telegram for Route Dispatches - Fleetillo',
            content: [
              { type: 'text/plain', value: textContent },
              { type: 'text/html', value: htmlContent },
            ],
          }),
        });

        // Log response for debugging
        const responseText = await response.text();
        console.log('[Email] SendGrid API response:', {
          status: response.status,
          statusText: response.statusText,
          body: responseText,
        });

        if (!response.ok) {
          throw new Error(`SendGrid API error (${response.status}): ${responseText}`);
        }
      }

      console.log('[Email] Registration email sent successfully to:', driverEmail);

      logger.info('Registration email sent successfully', {
        driverId,
        driverName: driverFullName,
        email: driverEmail,
        provider: emailProvider,
      });

      res.status(200).json({
        success: true,
        message: 'Registration email sent successfully',
        driverId,
        email: driverEmail,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error('[Email] FAILED to send registration email:', {
        driverId,
        email: driverEmail,
        provider: emailProvider,
        fromAddress,
        error: errorMessage,
      });

      logger.error('Failed to send registration email', {
        driverId,
        email: driverEmail,
        provider: emailProvider,
        error: errorMessage,
      });

      res.status(500).json({
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: `Failed to send registration email: ${errorMessage}`,
        },
        requestId: req.correlationId,
      });
    }
  };
}

/**
 * Build HTML content for registration email
 */
function buildRegistrationEmailHtml(
  driverFirstName: string,
  registrationLink: string,
  qrCodeUrl: string,
  customMessage?: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Register Your Telegram - Fleetillo</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📍 Fleetillo Dispatch</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Hi ${driverFirstName}! 👋</h2>

    <p>You've been invited to receive route dispatches via Telegram. This will allow you to get instant notifications about your assigned routes directly on your phone.</p>

    ${customMessage ? `<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0; font-style: italic;">${customMessage}</p></div>` : ''}

    <h3 style="color: #667eea;">How to Register:</h3>

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 15px 0;"><strong>Option 1:</strong> Scan this QR code with your phone's camera:</p>
      <div style="text-align: center;">
        <img src="${qrCodeUrl}" alt="QR Code" style="width: 200px; height: 200px; border: 1px solid #ddd; border-radius: 8px;">
      </div>
    </div>

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 15px 0;"><strong>Option 2:</strong> Click this link from your phone:</p>
      <div style="text-align: center;">
        <a href="${registrationLink}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Open in Telegram</a>
      </div>
      <p style="margin: 15px 0 0 0; font-size: 12px; color: #666; text-align: center;">Or copy this link: ${registrationLink}</p>
    </div>

    <h3 style="color: #667eea;">What Happens Next?</h3>
    <ol style="padding-left: 20px;">
      <li>Click the link or scan the QR code</li>
      <li>Telegram will open (install it first if you haven't)</li>
      <li>Tap "Start" when prompted</li>
      <li>You'll receive a confirmation message</li>
      <li>Done! You'll now receive route dispatches via Telegram</li>
    </ol>

    <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 14px; color: #666;">
      If you have any questions, please contact your dispatcher.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
    <p>This email was sent by Fleetillo Dispatch System</p>
  </div>
</body>
</html>
`;
}

/**
 * Build plain text content for registration email
 */
function buildRegistrationEmailText(
  driverFirstName: string,
  registrationLink: string,
  customMessage?: string
): string {
  return `
Hi ${driverFirstName}!

You've been invited to receive route dispatches via Telegram. This will allow you to get instant notifications about your assigned routes directly on your phone.

${customMessage ? `Message from your dispatcher: ${customMessage}\n` : ''}
HOW TO REGISTER:
================

1. Open this link on your phone: ${registrationLink}
2. Telegram will open (install it first if you haven't)
3. Tap "Start" when prompted
4. You'll receive a confirmation message
5. Done! You'll now receive route dispatches via Telegram

If you have any questions, please contact your dispatcher.

---
This email was sent by Fleetillo Dispatch System
`;
}

