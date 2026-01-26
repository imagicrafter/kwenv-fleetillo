/**
 * Unit tests for Zod Validation Schemas
 */

import {
  singleDispatchBodySchema,
  batchDispatchBodySchema,
  telegramUpdateSchema,
  sendRegistrationEmailBodySchema,
  listDispatchesQuerySchema,
  dispatchIdParamSchema,
  driverIdParamSchema,
  channelTypeSchema,
  uuidSchema,
} from '../../../src/validation/schemas.js';

describe('Validation Schemas', () => {
  describe('uuidSchema', () => {
    it('should accept valid UUIDs', () => {
      const validUuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      ];

      for (const uuid of validUuids) {
        expect(uuidSchema.safeParse(uuid).success).toBe(true);
      }
    });

    it('should reject invalid UUIDs', () => {
      const invalidUuids = [
        'not-a-uuid',
        '550e8400-e29b-41d4-a716',
        '550e8400-e29b-41d4-a716-44665544000g',
        '',
      ];

      for (const uuid of invalidUuids) {
        expect(uuidSchema.safeParse(uuid).success).toBe(false);
      }
    });
  });

  describe('channelTypeSchema', () => {
    it('should accept valid channel types', () => {
      const validChannels = ['telegram', 'email', 'sms', 'push'];

      for (const channel of validChannels) {
        expect(channelTypeSchema.safeParse(channel).success).toBe(true);
      }
    });

    it('should reject invalid channel types', () => {
      const invalidChannels = ['slack', 'whatsapp', '', 123];

      for (const channel of invalidChannels) {
        expect(channelTypeSchema.safeParse(channel).success).toBe(false);
      }
    });
  });

  describe('singleDispatchBodySchema', () => {
    const validPayload = {
      route_id: '550e8400-e29b-41d4-a716-446655440000',
      driver_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    };

    it('should accept valid minimal payload', () => {
      const result = singleDispatchBodySchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept payload with all optional fields', () => {
      const fullPayload = {
        ...validPayload,
        channels: ['telegram', 'email'],
        multi_channel: true,
        metadata: { priority: 'high' },
      };

      const result = singleDispatchBodySchema.safeParse(fullPayload);
      expect(result.success).toBe(true);
    });

    it('should reject missing route_id', () => {
      const payload = { driver_id: validPayload.driver_id };
      const result = singleDispatchBodySchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject missing driver_id', () => {
      const payload = { route_id: validPayload.route_id };
      const result = singleDispatchBodySchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject invalid route_id format', () => {
      const payload = { ...validPayload, route_id: 'not-a-uuid' };
      const result = singleDispatchBodySchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject invalid channel type', () => {
      const payload = { ...validPayload, channels: ['slack'] };
      const result = singleDispatchBodySchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean multi_channel', () => {
      const payload = { ...validPayload, multi_channel: 'yes' };
      const result = singleDispatchBodySchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('batchDispatchBodySchema', () => {
    const validDispatch = {
      route_id: '550e8400-e29b-41d4-a716-446655440000',
      driver_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    };

    it('should accept valid batch with single dispatch', () => {
      const result = batchDispatchBodySchema.safeParse({
        dispatches: [validDispatch],
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid batch with multiple dispatches', () => {
      const result = batchDispatchBodySchema.safeParse({
        dispatches: [validDispatch, validDispatch, validDispatch],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty dispatches array', () => {
      const result = batchDispatchBodySchema.safeParse({
        dispatches: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject batch exceeding 100 items', () => {
      const dispatches = Array(101).fill(validDispatch);
      const result = batchDispatchBodySchema.safeParse({ dispatches });
      expect(result.success).toBe(false);
    });

    it('should reject missing dispatches field', () => {
      const result = batchDispatchBodySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject invalid dispatch item in batch', () => {
      const result = batchDispatchBodySchema.safeParse({
        dispatches: [validDispatch, { route_id: 'invalid' }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('telegramUpdateSchema', () => {
    it('should accept valid message update', () => {
      const update = {
        update_id: 123456789,
        message: {
          message_id: 1,
          from: {
            id: 12345,
            is_bot: false,
            first_name: 'John',
          },
          chat: {
            id: 12345,
            type: 'private',
          },
          date: 1640000000,
          text: '/start',
        },
      };

      const result = telegramUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should accept valid callback query update', () => {
      const update = {
        update_id: 123456789,
        callback_query: {
          id: 'abc123',
          from: {
            id: 12345,
            is_bot: false,
            first_name: 'John',
          },
          data: 'ack:dispatch-id',
        },
      };

      const result = telegramUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should accept update with only update_id', () => {
      const update = {
        update_id: 123456789,
      };

      const result = telegramUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should reject missing update_id', () => {
      const update = {
        message: {
          message_id: 1,
          from: { id: 12345, is_bot: false, first_name: 'John' },
          chat: { id: 12345, type: 'private' },
          date: 1640000000,
        },
      };

      const result = telegramUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it('should reject invalid chat type', () => {
      const update = {
        update_id: 123456789,
        message: {
          message_id: 1,
          from: { id: 12345, is_bot: false, first_name: 'John' },
          chat: { id: 12345, type: 'invalid-type' },
          date: 1640000000,
        },
      };

      const result = telegramUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });

  describe('sendRegistrationEmailBodySchema', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';

    it('should accept valid payload with only driverId', () => {
      const result = sendRegistrationEmailBodySchema.safeParse({
        driverId: validUuid,
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid payload with customMessage', () => {
      const result = sendRegistrationEmailBodySchema.safeParse({
        driverId: validUuid,
        customMessage: 'Welcome to the team!',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid driverId', () => {
      const result = sendRegistrationEmailBodySchema.safeParse({
        driverId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject customMessage exceeding 500 characters', () => {
      const result = sendRegistrationEmailBodySchema.safeParse({
        driverId: validUuid,
        customMessage: 'x'.repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('listDispatchesQuerySchema', () => {
    it('should accept empty query (use defaults)', () => {
      const result = listDispatchesQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
        expect(result.data.offset).toBe(0);
      }
    });

    it('should accept valid filters', () => {
      const result = listDispatchesQuerySchema.safeParse({
        status: 'pending',
        driver_id: '550e8400-e29b-41d4-a716-446655440000',
        route_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        limit: '25',
        offset: '10',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(25);
        expect(result.data.offset).toBe(10);
      }
    });

    it('should coerce string numbers to integers', () => {
      const result = listDispatchesQuerySchema.safeParse({
        limit: '50',
        offset: '100',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.limit).toBe('number');
        expect(typeof result.data.offset).toBe('number');
      }
    });

    it('should reject invalid status', () => {
      const result = listDispatchesQuerySchema.safeParse({
        status: 'invalid-status',
      });
      expect(result.success).toBe(false);
    });

    it('should reject limit exceeding 100', () => {
      const result = listDispatchesQuerySchema.safeParse({
        limit: '150',
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative offset', () => {
      const result = listDispatchesQuerySchema.safeParse({
        offset: '-10',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('dispatchIdParamSchema', () => {
    it('should accept valid UUID', () => {
      const result = dispatchIdParamSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = dispatchIdParamSchema.safeParse({
        id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const result = dispatchIdParamSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('driverIdParamSchema', () => {
    it('should accept valid UUID', () => {
      const result = driverIdParamSchema.safeParse({
        driverId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = driverIdParamSchema.safeParse({
        driverId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });
  });
});
