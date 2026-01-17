/**
 * Database Module Exports
 *
 * Re-exports all database-related functionality for the dispatch service.
 *
 * @module db
 */

// Supabase client
export {
  getSupabaseClient,
  resetSupabaseClient,
  verifyConnection,
  type GenericSupabaseClient,
} from './supabase.js';

// Dispatch repository
export {
  // Types
  type CreateDispatchInput,
  type CreateChannelDispatchInput,
  type UpdateChannelDispatchInput,
  RepositoryError,
  RepositoryErrorCodes,
  // Dispatch functions
  createDispatch,
  getDispatch,
  getDispatchWithChannels,
  updateDispatchStatus,
  // Channel dispatch functions
  createChannelDispatch,
  updateChannelDispatch,
  getChannelDispatchesByDispatchId,
  createChannelDispatchBatch,
} from './dispatch.repository.js';
