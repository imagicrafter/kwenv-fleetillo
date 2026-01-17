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
async function updateDriverTelegramChatId(
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
async function getDriverById(driverId: string): Promise<{ id: string; firstName: string; lastName: string; telegramChatId?: string } | null> {
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

  const message = `🎉 *Welcome to OptiRoute Dispatch, ${driverName}!*

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
          `👋 *Welcome to OptiRoute Dispatch Bot!*

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

The registration link appears to be invalid. Please contact your dispatcher for a new link.`
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

    // Generate QR code URL using a public QR code service
    // Using Google Charts API for QR code generation
    const qrCodeUrl = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(registrationLink)}&choe=UTF-8`;

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
    const qrCodeUrl = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(registrationLink)}&choe=UTF-8`;

    // Send email using the email adapter
    const emailProvider = process.env.EMAIL_PROVIDER;
    const sendgridKey = process.env.SENDGRID_API_KEY || process.env.EMAIL_API_KEY;
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'dispatch@optiroute.com';
    const fromName = process.env.EMAIL_FROM_NAME || 'OptiRoute Dispatch';

    if (!sendgridKey) {
      res.status(503).json({
        error: {
          code: 'EMAIL_NOT_CONFIGURED',
          message: 'Email service is not configured',
        },
        requestId: req.correlationId,
      });
      return;
    }

    // Build email content
    const driverName = `${driver.first_name} ${driver.last_name}`;
    const htmlContent = buildRegistrationEmailHtml(driverName, registrationLink, qrCodeUrl, customMessage);
    const textContent = buildRegistrationEmailText(driverName, registrationLink, customMessage);

    try {
      // Send via SendGrid
      if (emailProvider === 'sendgrid' || !emailProvider) {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sendgridKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: driverEmail, name: driverName }] }],
            from: { email: fromAddress, name: fromName },
            subject: 'Register Your Telegram for Route Dispatches - OptiRoute',
            content: [
              { type: 'text/plain', value: textContent },
              { type: 'text/html', value: htmlContent },
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`SendGrid API error: ${errorText}`);
        }
      }

      logger.info('Registration email sent successfully', {
        driverId,
        driverName,
        email: driverEmail,
      });

      res.status(200).json({
        success: true,
        message: 'Registration email sent successfully',
        driverId,
        email: driverEmail,
      });

    } catch (error) {
      logger.error('Failed to send registration email', {
        driverId,
        email: driverEmail,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: 'Failed to send registration email',
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
  driverName: string,
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
  <title>Register Your Telegram - OptiRoute</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📍 OptiRoute Dispatch</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Hi ${driverName}! 👋</h2>

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
    <p>This email was sent by OptiRoute Dispatch System</p>
  </div>
</body>
</html>
`;
}

/**
 * Build plain text content for registration email
 */
function buildRegistrationEmailText(
  driverName: string,
  registrationLink: string,
  customMessage?: string
): string {
  return `
Hi ${driverName}!

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
This email was sent by OptiRoute Dispatch System
`;
}
