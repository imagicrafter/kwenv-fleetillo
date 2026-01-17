/**
 * Unit tests for Dispatch Repository
 *
 * Tests the data access functions for dispatch and channel_dispatch records.
 *
 * @requirements 8.1, 8.2, 8.3, 8.4
 */

import {
  createDispatch,
  getDispatch,
  getDispatchWithChannels,
  updateDispatchStatus,
  createChannelDispatch,
  updateChannelDispatch,
  getChannelDispatchesByDispatchId,
  createChannelDispatchBatch,
  RepositoryError,
  RepositoryErrorCodes,
  type CreateDispatchInput,
  type CreateChannelDispatchInput,
  type UpdateChannelDispatchInput,
} from '../../../src/db/dispatch.repository.js';
import { getSupabaseClient } from '../../../src/db/supabase.js';
import type { DispatchStatus, ChannelDispatchStatus, ChannelType } from '../../../src/types/index.js';

// Mock the Supabase client
jest.mock('../../../src/db/supabase.js', () => ({
  getSupabaseClient: jest.fn(),
  resetSupabaseClient: jest.fn(),
}));

// Mock the logger
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Dispatch Repository', () => {
  // Mock Supabase client methods
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockInsert: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockEq: jest.Mock;
  let mockSingle: jest.Mock;
  let mockOrder: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create chainable mock methods
    mockSingle = jest.fn();
    mockOrder = jest.fn().mockReturnValue({ data: [], error: null });
    mockEq = jest.fn().mockReturnThis();
    mockSelect = jest.fn().mockReturnValue({
      eq: mockEq,
      single: mockSingle,
      order: mockOrder,
    });
    mockInsert = jest.fn().mockReturnValue({
      select: mockSelect,
    });
    mockUpdate = jest.fn().mockReturnValue({
      eq: mockEq,
    });
    mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    });

    // Setup the mock client
    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: mockFrom,
    });
  });

  describe('createDispatch', () => {
    const validInput: CreateDispatchInput = {
      routeId: '123e4567-e89b-12d3-a456-426614174000',
      driverId: '123e4567-e89b-12d3-a456-426614174001',
      requestedChannels: ['telegram', 'email'],
      metadata: { priority: 'high' },
    };

    const mockDispatchRow = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      route_id: validInput.routeId,
      driver_id: validInput.driverId,
      status: 'pending' as DispatchStatus,
      requested_channels: validInput.requestedChannels,
      metadata: validInput.metadata,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    };

    it('should create a dispatch record successfully', async () => {
      mockSingle.mockResolvedValue({ data: mockDispatchRow, error: null });

      const result = await createDispatch(validInput);

      expect(mockFrom).toHaveBeenCalledWith('dispatches');
      expect(mockInsert).toHaveBeenCalledWith({
        route_id: validInput.routeId,
        driver_id: validInput.driverId,
        status: 'pending',
        requested_channels: validInput.requestedChannels,
        metadata: validInput.metadata,
      });
      expect(result.id).toBe(mockDispatchRow.id);
      expect(result.routeId).toBe(validInput.routeId);
      expect(result.driverId).toBe(validInput.driverId);
      expect(result.status).toBe('pending');
      expect(result.requestedChannels).toEqual(validInput.requestedChannels);
    });

    it('should create a dispatch without metadata', async () => {
      const inputWithoutMetadata: CreateDispatchInput = {
        routeId: validInput.routeId,
        driverId: validInput.driverId,
        requestedChannels: ['telegram'],
      };

      const rowWithoutMetadata = { ...mockDispatchRow, metadata: null };
      mockSingle.mockResolvedValue({ data: rowWithoutMetadata, error: null });

      const result = await createDispatch(inputWithoutMetadata);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: null,
        })
      );
      expect(result.metadata).toBeUndefined();
    });

    it('should throw RepositoryError when creation fails', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: '23505' },
      });

      await expect(createDispatch(validInput)).rejects.toThrow(RepositoryError);
      await expect(createDispatch(validInput)).rejects.toMatchObject({
        code: RepositoryErrorCodes.CREATE_FAILED,
      });
    });
  });

  describe('getDispatch', () => {
    const dispatchId = '123e4567-e89b-12d3-a456-426614174002';

    const mockDispatchRow = {
      id: dispatchId,
      route_id: '123e4567-e89b-12d3-a456-426614174000',
      driver_id: '123e4567-e89b-12d3-a456-426614174001',
      status: 'pending' as DispatchStatus,
      requested_channels: ['telegram'],
      metadata: null,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    };

    it('should retrieve a dispatch by ID', async () => {
      mockSingle.mockResolvedValue({ data: mockDispatchRow, error: null });

      const result = await getDispatch(dispatchId);

      expect(mockFrom).toHaveBeenCalledWith('dispatches');
      expect(mockEq).toHaveBeenCalledWith('id', dispatchId);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(dispatchId);
    });

    it('should return null when dispatch not found', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const result = await getDispatch(dispatchId);

      expect(result).toBeNull();
    });

    it('should throw RepositoryError on query failure', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: '42P01', message: 'Table not found' },
      });

      await expect(getDispatch(dispatchId)).rejects.toThrow(RepositoryError);
      await expect(getDispatch(dispatchId)).rejects.toMatchObject({
        code: RepositoryErrorCodes.QUERY_FAILED,
      });
    });
  });

  describe('updateDispatchStatus', () => {
    const dispatchId = '123e4567-e89b-12d3-a456-426614174002';
    const newStatus: DispatchStatus = 'delivered';

    const mockUpdatedRow = {
      id: dispatchId,
      route_id: '123e4567-e89b-12d3-a456-426614174000',
      driver_id: '123e4567-e89b-12d3-a456-426614174001',
      status: newStatus,
      requested_channels: ['telegram'],
      metadata: null,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:30:00Z',
    };

    it('should update dispatch status successfully', async () => {
      // Setup the chain for update
      mockEq.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockUpdatedRow, error: null }),
        }),
      });

      const result = await updateDispatchStatus(dispatchId, newStatus);

      expect(mockFrom).toHaveBeenCalledWith('dispatches');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: newStatus,
        })
      );
      expect(result.status).toBe(newStatus);
    });

    it('should throw RepositoryError when dispatch not found', async () => {
      mockEq.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' },
          }),
        }),
      });

      await expect(updateDispatchStatus(dispatchId, newStatus)).rejects.toThrow(RepositoryError);
      await expect(updateDispatchStatus(dispatchId, newStatus)).rejects.toMatchObject({
        code: RepositoryErrorCodes.NOT_FOUND,
      });
    });
  });

  describe('createChannelDispatch', () => {
    const validInput: CreateChannelDispatchInput = {
      dispatchId: '123e4567-e89b-12d3-a456-426614174002',
      channel: 'telegram' as ChannelType,
    };

    const mockChannelDispatchRow = {
      id: '123e4567-e89b-12d3-a456-426614174003',
      dispatch_id: validInput.dispatchId,
      channel: validInput.channel,
      status: 'pending' as ChannelDispatchStatus,
      provider_message_id: null,
      error_message: null,
      sent_at: null,
      delivered_at: null,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    };

    it('should create a channel dispatch record successfully', async () => {
      mockSingle.mockResolvedValue({ data: mockChannelDispatchRow, error: null });

      const result = await createChannelDispatch(validInput);

      expect(mockFrom).toHaveBeenCalledWith('channel_dispatches');
      expect(mockInsert).toHaveBeenCalledWith({
        dispatch_id: validInput.dispatchId,
        channel: validInput.channel,
        status: 'pending',
      });
      expect(result.id).toBe(mockChannelDispatchRow.id);
      expect(result.dispatchId).toBe(validInput.dispatchId);
      expect(result.channel).toBe(validInput.channel);
    });

    it('should create channel dispatch with custom status', async () => {
      const inputWithStatus: CreateChannelDispatchInput = {
        ...validInput,
        status: 'sending' as ChannelDispatchStatus,
      };

      const rowWithStatus = { ...mockChannelDispatchRow, status: 'sending' };
      mockSingle.mockResolvedValue({ data: rowWithStatus, error: null });

      const result = await createChannelDispatch(inputWithStatus);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'sending',
        })
      );
      expect(result.status).toBe('sending');
    });

    it('should throw RepositoryError when creation fails', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Foreign key violation', code: '23503' },
      });

      await expect(createChannelDispatch(validInput)).rejects.toThrow(RepositoryError);
      await expect(createChannelDispatch(validInput)).rejects.toMatchObject({
        code: RepositoryErrorCodes.CHANNEL_CREATE_FAILED,
      });
    });
  });

  describe('updateChannelDispatch', () => {
    const channelDispatchId = '123e4567-e89b-12d3-a456-426614174003';

    const mockUpdatedRow = {
      id: channelDispatchId,
      dispatch_id: '123e4567-e89b-12d3-a456-426614174002',
      channel: 'telegram',
      status: 'delivered' as ChannelDispatchStatus,
      provider_message_id: 'msg_12345',
      error_message: null,
      sent_at: '2024-01-15T10:00:00Z',
      delivered_at: '2024-01-15T10:00:05Z',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:05Z',
    };

    it('should update channel dispatch with all fields', async () => {
      const updateInput: UpdateChannelDispatchInput = {
        status: 'delivered',
        providerMessageId: 'msg_12345',
        sentAt: new Date('2024-01-15T10:00:00Z'),
        deliveredAt: new Date('2024-01-15T10:00:05Z'),
      };

      mockEq.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockUpdatedRow, error: null }),
        }),
      });

      const result = await updateChannelDispatch(channelDispatchId, updateInput);

      expect(mockFrom).toHaveBeenCalledWith('channel_dispatches');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'delivered',
          provider_message_id: 'msg_12345',
        })
      );
      expect(result.status).toBe('delivered');
      expect(result.providerMessageId).toBe('msg_12345');
    });

    it('should update channel dispatch with error message on failure', async () => {
      const updateInput: UpdateChannelDispatchInput = {
        status: 'failed',
        errorMessage: 'Chat not found',
      };

      const failedRow = {
        ...mockUpdatedRow,
        status: 'failed' as ChannelDispatchStatus,
        error_message: 'Chat not found',
        provider_message_id: null,
        delivered_at: null,
      };

      mockEq.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: failedRow, error: null }),
        }),
      });

      const result = await updateChannelDispatch(channelDispatchId, updateInput);

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('Chat not found');
    });

    it('should throw RepositoryError when channel dispatch not found', async () => {
      mockEq.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' },
          }),
        }),
      });

      await expect(
        updateChannelDispatch(channelDispatchId, { status: 'delivered' })
      ).rejects.toThrow(RepositoryError);
      await expect(
        updateChannelDispatch(channelDispatchId, { status: 'delivered' })
      ).rejects.toMatchObject({
        code: RepositoryErrorCodes.NOT_FOUND,
      });
    });
  });

  describe('getChannelDispatchesByDispatchId', () => {
    const dispatchId = '123e4567-e89b-12d3-a456-426614174002';

    const mockChannelDispatchRows = [
      {
        id: '123e4567-e89b-12d3-a456-426614174003',
        dispatch_id: dispatchId,
        channel: 'telegram',
        status: 'delivered' as ChannelDispatchStatus,
        provider_message_id: 'msg_12345',
        error_message: null,
        sent_at: '2024-01-15T10:00:00Z',
        delivered_at: '2024-01-15T10:00:05Z',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:05Z',
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174004',
        dispatch_id: dispatchId,
        channel: 'email',
        status: 'failed' as ChannelDispatchStatus,
        provider_message_id: null,
        error_message: 'Invalid email address',
        sent_at: '2024-01-15T10:00:00Z',
        delivered_at: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:10Z',
      },
    ];

    it('should retrieve all channel dispatches for a dispatch', async () => {
      mockOrder.mockReturnValue({ data: mockChannelDispatchRows, error: null });

      const result = await getChannelDispatchesByDispatchId(dispatchId);

      expect(mockFrom).toHaveBeenCalledWith('channel_dispatches');
      expect(mockEq).toHaveBeenCalledWith('dispatch_id', dispatchId);
      expect(result).toHaveLength(2);
      expect(result[0]!.channel).toBe('telegram');
      expect(result[1]!.channel).toBe('email');
    });

    it('should return empty array when no channel dispatches found', async () => {
      mockOrder.mockReturnValue({ data: [], error: null });

      const result = await getChannelDispatchesByDispatchId(dispatchId);

      expect(result).toHaveLength(0);
    });
  });

  describe('createChannelDispatchBatch', () => {
    const dispatchId = '123e4567-e89b-12d3-a456-426614174002';

    const inputs: CreateChannelDispatchInput[] = [
      { dispatchId, channel: 'telegram' as ChannelType },
      { dispatchId, channel: 'email' as ChannelType },
    ];

    const mockBatchRows = [
      {
        id: '123e4567-e89b-12d3-a456-426614174003',
        dispatch_id: dispatchId,
        channel: 'telegram',
        status: 'pending' as ChannelDispatchStatus,
        provider_message_id: null,
        error_message: null,
        sent_at: null,
        delivered_at: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174004',
        dispatch_id: dispatchId,
        channel: 'email',
        status: 'pending' as ChannelDispatchStatus,
        provider_message_id: null,
        error_message: null,
        sent_at: null,
        delivered_at: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      },
    ];

    it('should create multiple channel dispatches in batch', async () => {
      mockSelect.mockReturnValue({ data: mockBatchRows, error: null });

      const result = await createChannelDispatchBatch(inputs);

      expect(mockFrom).toHaveBeenCalledWith('channel_dispatches');
      expect(mockInsert).toHaveBeenCalledWith([
        { dispatch_id: dispatchId, channel: 'telegram', status: 'pending' },
        { dispatch_id: dispatchId, channel: 'email', status: 'pending' },
      ]);
      expect(result).toHaveLength(2);
    });

    it('should return empty array for empty input', async () => {
      const result = await createChannelDispatchBatch([]);

      expect(mockFrom).not.toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });
  });

  describe('getDispatchWithChannels', () => {
    const dispatchId = '123e4567-e89b-12d3-a456-426614174002';

    const mockDispatchRow = {
      id: dispatchId,
      route_id: '123e4567-e89b-12d3-a456-426614174000',
      driver_id: '123e4567-e89b-12d3-a456-426614174001',
      status: 'delivered' as DispatchStatus,
      requested_channels: ['telegram', 'email'],
      metadata: null,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:05Z',
    };

    const mockChannelDispatchRows = [
      {
        id: '123e4567-e89b-12d3-a456-426614174003',
        dispatch_id: dispatchId,
        channel: 'telegram',
        status: 'delivered' as ChannelDispatchStatus,
        provider_message_id: 'msg_12345',
        error_message: null,
        sent_at: '2024-01-15T10:00:00Z',
        delivered_at: '2024-01-15T10:00:05Z',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:05Z',
      },
    ];

    it('should retrieve dispatch with all channel dispatches', async () => {
      // First call for dispatch
      mockSingle.mockResolvedValueOnce({ data: mockDispatchRow, error: null });
      // Second call for channel dispatches
      mockOrder.mockReturnValue({ data: mockChannelDispatchRows, error: null });

      const result = await getDispatchWithChannels(dispatchId);

      expect(result).not.toBeNull();
      expect(result?.dispatch.id).toBe(dispatchId);
      expect(result?.channelDispatches).toHaveLength(1);
      expect(result?.channelDispatches[0]!.channel).toBe('telegram');
    });

    it('should return null when dispatch not found', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const result = await getDispatchWithChannels(dispatchId);

      expect(result).toBeNull();
    });
  });
});
