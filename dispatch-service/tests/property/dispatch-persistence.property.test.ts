/**
 * Property-Based Tests for Dispatch Persistence
 *
 * Feature: dispatch-service, Property 1: Dispatch Creation Persistence
 *
 * **Validates: Requirements 1.1, 8.1**
 *
 * Property 1 from design.md states:
 * "For any valid dispatch request with existing route_id and driver_id, creating a dispatch
 * SHALL result in a dispatch record in the database with matching route_id, driver_id,
 * and status 'pending'."
 *
 * This test verifies:
 * 1. Created dispatch has matching route_id and driver_id
 * 2. Created dispatch has status 'pending'
 * 3. Created dispatch has the requested channels
 * 4. Created dispatch has valid timestamps
 */

import * as fc from 'fast-check';
import {
  createDispatch,
  getDispatch,
  type CreateDispatchInput,
} from '../../src/db/dispatch.repository.js';
import { getSupabaseClient } from '../../src/db/supabase.js';
import type { ChannelType, DispatchRow } from '../../src/types/index.js';

// Mock the Supabase client
jest.mock('../../src/db/supabase.js', () => ({
  getSupabaseClient: jest.fn(),
  resetSupabaseClient: jest.fn(),
}));

// Mock the logger
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Property 1: Dispatch Creation Persistence', () => {
  // =============================================================================
  // Arbitrary Generators
  // =============================================================================

  /**
   * Arbitrary generator for valid UUID strings.
   */
  const arbitraryUuid = (): fc.Arbitrary<string> => fc.uuid();

  /**
   * Arbitrary generator for valid channel types.
   */
  const arbitraryChannelType = (): fc.Arbitrary<ChannelType> =>
    fc.constantFrom('telegram', 'email') as fc.Arbitrary<ChannelType>;

  /**
   * Arbitrary generator for a non-empty array of unique channel types.
   */
  const arbitraryChannelArray = (): fc.Arbitrary<ChannelType[]> =>
    fc
      .array(arbitraryChannelType(), { minLength: 1, maxLength: 2 })
      .map((channels) => [...new Set(channels)] as ChannelType[]);

  /**
   * Arbitrary generator for optional metadata.
   */
  const arbitraryMetadata = (): fc.Arbitrary<Record<string, unknown> | undefined> =>
    fc.option(
      fc.record({
        priority: fc.constantFrom('low', 'normal', 'high'),
        source: fc.string({ minLength: 1, maxLength: 20 }),
        retryCount: fc.nat({ max: 5 }),
      }),
      { nil: undefined }
    );

  /**
   * Arbitrary generator for valid dispatch input.
   */
  const arbitraryDispatchInput = (): fc.Arbitrary<CreateDispatchInput> =>
    fc.record({
      routeId: arbitraryUuid(),
      driverId: arbitraryUuid(),
      requestedChannels: arbitraryChannelArray(),
      metadata: arbitraryMetadata(),
    });

  /**
   * Helper to create a mock dispatch row from input.
   */
  function createMockDispatchRow(
    input: CreateDispatchInput,
    dispatchId: string
  ): DispatchRow {
    const now = new Date().toISOString();
    return {
      id: dispatchId,
      route_id: input.routeId,
      driver_id: input.driverId,
      status: 'pending',
      requested_channels: input.requestedChannels,
      metadata: input.metadata ?? null,
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Helper to setup mock Supabase client for a single test iteration.
   * Returns the inserted data for verification.
   */
  function setupMockClient(mockRow: DispatchRow): { getInsertedData: () => Record<string, unknown> | null } {
    let insertedData: Record<string, unknown> | null = null;

    const mockSingle = jest.fn().mockResolvedValue({ data: mockRow, error: null });
    const mockEq = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnValue({
      eq: mockEq,
      single: mockSingle,
    });
    const mockInsert = jest.fn().mockImplementation((data: Record<string, unknown>) => {
      insertedData = data;
      return {
        select: mockSelect,
      };
    });
    const mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: mockFrom,
    });

    return {
      getInsertedData: () => insertedData,
    };
  }

  /**
   * Helper to setup mock for retrieval operations.
   */
  function setupMockClientForRetrieval(mockRow: DispatchRow): void {
    const mockSingle = jest.fn().mockResolvedValue({ data: mockRow, error: null });
    const mockEq = jest.fn().mockReturnValue({
      single: mockSingle,
    });
    const mockSelect = jest.fn().mockReturnValue({
      eq: mockEq,
      single: mockSingle,
    });
    const mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
    });

    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: mockFrom,
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =============================================================================
  // Property Tests
  // =============================================================================

  describe('Requirement 1.1: Dispatch creation with valid route_id and driver_id', () => {
    /**
     * Property: For any valid dispatch input, the created dispatch SHALL have
     * matching route_id and driver_id.
     */
    it('should create dispatch with matching route_id and driver_id', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchInput(),
          arbitraryUuid(),
          async (input, generatedDispatchId) => {
            // Setup mock to return a dispatch row with the input data
            const mockRow = createMockDispatchRow(input, generatedDispatchId);
            const { getInsertedData } = setupMockClient(mockRow);

            // Create the dispatch
            const result = await createDispatch(input);

            // Assert: route_id matches
            expect(result.routeId).toBe(input.routeId);
            // Assert: driver_id matches
            expect(result.driverId).toBe(input.driverId);

            // Verify the insert was called with correct data
            const insertedData = getInsertedData();
            expect(insertedData).not.toBeNull();
            expect(insertedData!.route_id).toBe(input.routeId);
            expect(insertedData!.driver_id).toBe(input.driverId);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 8.1: Dispatch status is pending on creation', () => {
    /**
     * Property: For any valid dispatch input, the created dispatch SHALL have
     * status 'pending'.
     */
    it('should always create dispatch with status pending', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchInput(),
          arbitraryUuid(),
          async (input, generatedDispatchId) => {
            // Setup mock to return a dispatch row
            const mockRow = createMockDispatchRow(input, generatedDispatchId);
            const { getInsertedData } = setupMockClient(mockRow);

            // Create the dispatch
            const result = await createDispatch(input);

            // Assert: status is always 'pending'
            expect(result.status).toBe('pending');

            // Verify the insert was called with status 'pending'
            const insertedData = getInsertedData();
            expect(insertedData).not.toBeNull();
            expect(insertedData!.status).toBe('pending');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 8.1: Dispatch has requested channels', () => {
    /**
     * Property: For any valid dispatch input with requested channels,
     * the created dispatch SHALL have the same requested channels.
     */
    it('should create dispatch with matching requested channels', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchInput(),
          arbitraryUuid(),
          async (input, generatedDispatchId) => {
            // Setup mock to return a dispatch row
            const mockRow = createMockDispatchRow(input, generatedDispatchId);
            const { getInsertedData } = setupMockClient(mockRow);

            // Create the dispatch
            const result = await createDispatch(input);

            // Assert: requested channels match
            expect(result.requestedChannels).toEqual(input.requestedChannels);
            expect(result.requestedChannels.length).toBeGreaterThan(0);

            // Verify the insert was called with correct channels
            const insertedData = getInsertedData();
            expect(insertedData).not.toBeNull();
            expect(insertedData!.requested_channels).toEqual(input.requestedChannels);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Requested channels should only contain valid channel types.
     */
    it('should only accept valid channel types', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchInput(),
          arbitraryUuid(),
          async (input, generatedDispatchId) => {
            // Setup mock to return a dispatch row
            const mockRow = createMockDispatchRow(input, generatedDispatchId);
            setupMockClient(mockRow);

            // Create the dispatch
            const result = await createDispatch(input);

            // Assert: all channels are valid types
            const validChannels: ChannelType[] = ['telegram', 'email', 'sms', 'push'];
            for (const channel of result.requestedChannels) {
              expect(validChannels).toContain(channel);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 8.1: Dispatch has valid timestamps', () => {
    /**
     * Property: For any created dispatch, createdAt and updatedAt SHALL be
     * valid Date objects.
     */
    it('should create dispatch with valid timestamps', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchInput(),
          arbitraryUuid(),
          async (input, generatedDispatchId) => {
            // Setup mock to return a dispatch row with current timestamp
            const mockRow = createMockDispatchRow(input, generatedDispatchId);
            setupMockClient(mockRow);

            // Create the dispatch
            const result = await createDispatch(input);

            // Assert: createdAt is a valid Date
            expect(result.createdAt).toBeInstanceOf(Date);
            expect(isNaN(result.createdAt.getTime())).toBe(false);

            // Assert: updatedAt is a valid Date
            expect(result.updatedAt).toBeInstanceOf(Date);
            expect(isNaN(result.updatedAt.getTime())).toBe(false);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For a newly created dispatch, createdAt and updatedAt SHALL
     * be equal (or very close in time).
     */
    it('should have createdAt equal to updatedAt on creation', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchInput(),
          arbitraryUuid(),
          async (input, generatedDispatchId) => {
            // Setup mock to return a dispatch row with same timestamps
            const now = new Date().toISOString();
            const mockRow: DispatchRow = {
              id: generatedDispatchId,
              route_id: input.routeId,
              driver_id: input.driverId,
              status: 'pending',
              requested_channels: input.requestedChannels,
              metadata: input.metadata ?? null,
              created_at: now,
              updated_at: now,
            };
            setupMockClient(mockRow);

            // Create the dispatch
            const result = await createDispatch(input);

            // Assert: timestamps are equal on creation
            expect(result.createdAt.getTime()).toBe(result.updatedAt.getTime());

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Dispatch ID generation', () => {
    /**
     * Property: For any created dispatch, the id SHALL be a valid UUID.
     */
    it('should generate valid UUID for dispatch id', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchInput(),
          arbitraryUuid(),
          async (input, generatedDispatchId) => {
            // Setup mock to return a dispatch row
            const mockRow = createMockDispatchRow(input, generatedDispatchId);
            setupMockClient(mockRow);

            // Create the dispatch
            const result = await createDispatch(input);

            // Assert: id is a non-empty string
            expect(typeof result.id).toBe('string');
            expect(result.id.length).toBeGreaterThan(0);

            // Assert: id matches UUID format
            const uuidRegex =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            expect(result.id).toMatch(uuidRegex);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Metadata handling', () => {
    /**
     * Property: For any dispatch input with metadata, the created dispatch
     * SHALL preserve the metadata.
     */
    it('should preserve metadata when provided', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchInput().filter((input) => input.metadata !== undefined),
          arbitraryUuid(),
          async (input, generatedDispatchId) => {
            // Setup mock to return a dispatch row
            const mockRow = createMockDispatchRow(input, generatedDispatchId);
            const { getInsertedData } = setupMockClient(mockRow);

            // Create the dispatch
            const result = await createDispatch(input);

            // Assert: metadata is preserved
            expect(result.metadata).toEqual(input.metadata);

            // Verify the insert was called with correct metadata
            const insertedData = getInsertedData();
            expect(insertedData).not.toBeNull();
            expect(insertedData!.metadata).toEqual(input.metadata);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch input without metadata, the created dispatch
     * SHALL have undefined metadata.
     */
    it('should handle missing metadata correctly', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchInput().map((input) => ({ ...input, metadata: undefined })),
          arbitraryUuid(),
          async (input, generatedDispatchId) => {
            // Setup mock to return a dispatch row with null metadata
            const mockRow: DispatchRow = {
              id: generatedDispatchId,
              route_id: input.routeId,
              driver_id: input.driverId,
              status: 'pending',
              requested_channels: input.requestedChannels,
              metadata: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            const { getInsertedData } = setupMockClient(mockRow);

            // Create the dispatch
            const result = await createDispatch(input);

            // Assert: metadata is undefined when not provided
            expect(result.metadata).toBeUndefined();

            // Verify the insert was called with null metadata
            const insertedData = getInsertedData();
            expect(insertedData).not.toBeNull();
            expect(insertedData!.metadata).toBeNull();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Database interaction verification', () => {
    /**
     * Property: For any dispatch creation, the repository SHALL call the
     * database with the correct table name.
     */
    it('should always insert into dispatches table', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchInput(),
          arbitraryUuid(),
          async (input, generatedDispatchId) => {
            // Setup mock to return a dispatch row
            const mockRow = createMockDispatchRow(input, generatedDispatchId);
            setupMockClient(mockRow);

            // Create the dispatch
            await createDispatch(input);

            // Assert: from() was called with 'dispatches'
            const mockClient = (getSupabaseClient as jest.Mock).mock.results[0]?.value;
            expect(mockClient.from).toHaveBeenCalledWith('dispatches');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch creation, the insert data SHALL contain
     * all required fields.
     */
    it('should include all required fields in insert', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchInput(),
          arbitraryUuid(),
          async (input, generatedDispatchId) => {
            // Setup mock to return a dispatch row
            const mockRow = createMockDispatchRow(input, generatedDispatchId);
            const { getInsertedData } = setupMockClient(mockRow);

            // Create the dispatch
            await createDispatch(input);

            // Assert: all required fields are present in insert data
            const insertedData = getInsertedData();
            expect(insertedData).not.toBeNull();
            expect(insertedData).toHaveProperty('route_id');
            expect(insertedData).toHaveProperty('driver_id');
            expect(insertedData).toHaveProperty('status');
            expect(insertedData).toHaveProperty('requested_channels');
            expect(insertedData).toHaveProperty('metadata');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Dispatch retrieval consistency', () => {
    /**
     * Property: For any created dispatch, retrieving it by ID SHALL return
     * the same data that was created.
     */
    it('should retrieve dispatch with same data as created', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryDispatchInput(),
          arbitraryUuid(),
          async (input, generatedDispatchId) => {
            // Setup mock for creation
            const mockRow = createMockDispatchRow(input, generatedDispatchId);
            setupMockClient(mockRow);

            // Create the dispatch
            const created = await createDispatch(input);

            // Setup mock for retrieval
            setupMockClientForRetrieval(mockRow);

            // Retrieve the dispatch
            const retrieved = await getDispatch(created.id);

            // Assert: retrieved dispatch matches created dispatch
            expect(retrieved).not.toBeNull();
            expect(retrieved!.id).toBe(created.id);
            expect(retrieved!.routeId).toBe(created.routeId);
            expect(retrieved!.driverId).toBe(created.driverId);
            expect(retrieved!.status).toBe(created.status);
            expect(retrieved!.requestedChannels).toEqual(created.requestedChannels);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
