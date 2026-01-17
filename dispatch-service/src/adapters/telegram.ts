/**
 * Telegram Channel Adapter
 *
 * Implements the ChannelAdapter interface for sending dispatch messages
 * via Telegram Bot API.
 *
 * @module adapters/telegram
 * @requirements 4.1 - Use Telegram Bot API to deliver message to driver's telegram_chat_id
 * @requirements 4.2 - Update channel_dispatch status to 'delivered' and record message_id on success
 * @requirements 4.3 - Return failure if driver doesn't have telegram_chat_id configured
 * @requirements 4.4 - Update channel_dispatch status to 'failed' and record error on API error
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
 * Telegram Bot API response for sendMessage
 */
interface TelegramSendMessageResponse {
  ok: boolean;
  result?: {
    message_id: number;
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
  error_code?: number;
  description?: string;
}

/**
 * Telegram Bot API response for getMe
 */
interface TelegramGetMeResponse {
  ok: boolean;
  result?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  error_code?: number;
  description?: string;
}

/**
 * Get the Telegram Bot API base URL
 */
function getTelegramApiUrl(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
  }
  return `https://api.telegram.org/bot${token}`;
}

/**
 * Check if the Telegram bot token is configured
 */
export function isTelegramConfigured(): boolean {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  return !!token && token.trim().length > 0;
}

/**
 * Telegram Channel Adapter
 *
 * Sends dispatch messages to drivers via Telegram Bot API.
 */
export class TelegramAdapter implements ChannelAdapter {
  readonly channelType: ChannelType = 'telegram';

  /**
   * Check if this adapter can send to the given driver.
   * Returns true if the driver has a telegram_chat_id configured.
   *
   * @param driver - The driver to check
   * @returns true if the driver has a valid telegram_chat_id
   * @requirements 4.3 - Return failure if driver doesn't have telegram_chat_id configured
   */
  canSend(driver: Driver): boolean {
    return !!driver.telegramChatId && driver.telegramChatId.trim().length > 0;
  }

  /**
   * Send a dispatch message to the driver via Telegram.
   *
   * @param context - The dispatch context containing all message data
   * @returns A promise resolving to the channel result
   * @requirements 4.1 - Use Telegram Bot API to deliver message
   * @requirements 4.2 - Record message_id on success
   * @requirements 4.3 - Return failure if driver doesn't have telegram_chat_id
   * @requirements 4.4 - Record error on API error
   */
  async send(context: DispatchContext): Promise<ChannelResult> {
    const sentAt = new Date();
    const { driver, dispatch, template } = context;

    // Check if driver has telegram_chat_id configured
    if (!this.canSend(driver)) {
      logger.warn('Driver does not have telegram_chat_id configured', {
        dispatchId: dispatch.id,
        driverId: driver.id,
        channel: this.channelType,
      });

      return {
        success: false,
        channelType: this.channelType,
        error: 'Driver does not have telegram_chat_id configured',
        sentAt,
      };
    }

    // Check if Telegram bot token is configured
    if (!isTelegramConfigured()) {
      logger.error('Telegram bot token is not configured', {
        dispatchId: dispatch.id,
        channel: this.channelType,
      });

      return {
        success: false,
        channelType: this.channelType,
        error: 'Telegram bot token is not configured',
        sentAt,
      };
    }

    try {
      const apiUrl = getTelegramApiUrl();
      const response = await fetch(`${apiUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: driver.telegramChatId,
          text: template,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '✅ Acknowledge Receipt',
                  callback_data: `ack:${dispatch.id}`,
                },
              ],
            ],
          },
        }),
      });

      const data = (await response.json()) as TelegramSendMessageResponse;

      if (data.ok && data.result) {
        logger.info('Telegram message sent successfully', {
          dispatchId: dispatch.id,
          driverId: driver.id,
          channel: this.channelType,
          messageId: data.result.message_id.toString(),
        });

        return {
          success: true,
          channelType: this.channelType,
          providerMessageId: data.result.message_id.toString(),
          sentAt,
        };
      } else {
        const errorMessage = data.description || 'Unknown Telegram API error';
        logger.error('Telegram API returned error', {
          dispatchId: dispatch.id,
          driverId: driver.id,
          channel: this.channelType,
          errorCode: data.error_code,
          errorDescription: errorMessage,
        });

        return {
          success: false,
          channelType: this.channelType,
          error: errorMessage,
          sentAt,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      logger.error(
        'Failed to send Telegram message',
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
   * Check the health/connectivity of the Telegram adapter.
   * Verifies that the bot token is valid by calling the getMe API.
   *
   * @returns A promise resolving to the health status
   */
  async healthCheck(): Promise<HealthStatus> {
    // Check if bot token is configured
    if (!isTelegramConfigured()) {
      return {
        healthy: false,
        message: 'Telegram bot token is not configured',
      };
    }

    try {
      const apiUrl = getTelegramApiUrl();
      const response = await fetch(`${apiUrl}/getMe`, {
        method: 'GET',
      });

      const data = (await response.json()) as TelegramGetMeResponse;

      if (data.ok && data.result) {
        return {
          healthy: true,
          message: `Bot connected: @${data.result.username || data.result.first_name}`,
        };
      } else {
        return {
          healthy: false,
          message: data.description || 'Failed to verify bot connectivity',
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      logger.error(
        'Telegram health check failed',
        { channel: this.channelType },
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
export const telegramAdapter = new TelegramAdapter();
