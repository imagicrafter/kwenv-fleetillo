/**
 * Import Services Module
 *
 * Issue #18: CSV Parser & Data Normalization for Legacy Import
 *
 * Exports all import-related services and utilities.
 */

// CSV Parser
export {
  loadCsv,
  validateCsvColumns,
  countCsvRows,
  validateRow,
  previewCsv,
  type CsvValidationResult,
  type CsvLoadOptions,
} from './csv-parser.service.js';

// Data Normalizer
export {
  normalize,
  getUniqueCustomers,
  getUniqueLocations,
  getBookings,
} from './data-normalizer.js';

// Import Service
export {
  createBatch,
  parseAndStage,
  getBatchStatus,
  listBatches,
  getStagingRecords,
  exportBatchJson,
} from './import.service.js';

// Commit Service
export {
  commitBatch,
  rollbackBatch,
} from './commit.service.js';

// Re-export types
export type {
  ImportBatch,
  ImportSummary,
  StagingRecord,
  ParsedCustomer,
  ParsedLocation,
  ParsedBooking,
  CsvRow,
  ParseError,
  NormalizationResult,
  CommitResult,
  RollbackResult,
} from '../../types/import.types.js';
