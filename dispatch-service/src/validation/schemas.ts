/**
 * Zod Validation Schemas
 *
 * Defines input validation schemas for all API endpoints.
 * Uses Zod for TypeScript-first schema validation with excellent type inference.
 *
 * @module validation/schemas
 */

import { z } from 'zod';

/**
 * UUID validation regex pattern
 * Matches standard UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Supported channel types
 */
export const channelTypeSchema = z.enum(['telegram', 'email', 'sms', 'push']);

/**
 * UUID schema with custom error message
 */
export const uuidSchema = z.string().regex(uuidRegex, 'Must be a valid UUID');

/**
 * Single dispatch request body schema
 *
 * Validates POST /api/v1/dispatch requests
 */
export const singleDispatchBodySchema = z.object({
  route_id: uuidSchema,
  driver_id: uuidSchema,
  channels: z.array(channelTypeSchema).optional(),
  multi_channel: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Batch dispatch request body schema
 *
 * Validates POST /api/v1/dispatch/batch requests
 */
export const batchDispatchBodySchema = z.object({
  dispatches: z
    .array(singleDispatchBodySchema)
    .min(1, 'dispatches array cannot be empty')
    .max(100, 'Batch size exceeds maximum of 100 items'),
});

/**
 * Telegram user schema (from webhook updates)
 */
const telegramUserSchema = z.object({
  id: z.number(),
  is_bot: z.boolean(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
});

/**
 * Telegram chat schema (from webhook updates)
 */
const telegramChatSchema = z.object({
  id: z.number(),
  type: z.enum(['private', 'group', 'supergroup', 'channel']),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
});

/**
 * Telegram message schema (from webhook updates)
 */
const telegramMessageSchema = z.object({
  message_id: z.number(),
  from: telegramUserSchema,
  chat: telegramChatSchema,
  date: z.number(),
  text: z.string().optional(),
});

/**
 * Telegram callback query schema (button clicks)
 */
const telegramCallbackQuerySchema = z.object({
  id: z.string(),
  from: telegramUserSchema,
  message: z
    .object({
      message_id: z.number(),
      chat: z.object({
        id: z.number(),
        type: z.string(),
      }),
    })
    .optional(),
  data: z.string().optional(),
});

/**
 * Telegram webhook update schema
 *
 * Validates incoming Telegram webhook payloads
 */
export const telegramUpdateSchema = z.object({
  update_id: z.number(),
  message: telegramMessageSchema.optional(),
  callback_query: telegramCallbackQuerySchema.optional(),
});

/**
 * Send registration email request body schema
 */
export const sendRegistrationEmailBodySchema = z.object({
  driverId: uuidSchema,
  customMessage: z.string().max(500, 'Custom message too long').optional(),
});

/**
 * List dispatches query parameters schema
 */
export const listDispatchesQuerySchema = z.object({
  status: z
    .enum(['pending', 'sending', 'delivered', 'partial', 'failed'])
    .optional(),
  driver_id: uuidSchema.optional(),
  route_id: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Dispatch ID parameter schema
 */
export const dispatchIdParamSchema = z.object({
  id: uuidSchema,
});

/**
 * Driver ID parameter schema
 */
export const driverIdParamSchema = z.object({
  driverId: uuidSchema,
});

// Type exports inferred from schemas
export type SingleDispatchBody = z.infer<typeof singleDispatchBodySchema>;
export type BatchDispatchBody = z.infer<typeof batchDispatchBodySchema>;
export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;
export type SendRegistrationEmailBody = z.infer<typeof sendRegistrationEmailBodySchema>;
export type ListDispatchesQuery = z.infer<typeof listDispatchesQuerySchema>;
