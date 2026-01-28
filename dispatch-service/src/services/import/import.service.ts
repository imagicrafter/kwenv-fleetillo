/**
 * Import Service
 *
 * Issue #18: CSV Parser & Data Normalization for Legacy Import
 *
 * Orchestrates the import pipeline:
 * 1. Creates import batch record
 * 2. Loads and validates CSV
 * 3. Normalizes data
 * 4. Writes to staging tables
 * 5. Returns batch summary
 */

import {
  ImportBatch,
  ImportBatchRow,
  ImportSummary,
  StagingRecord,
  StagingRecordRow,
  ParsedCustomer,
  ParsedLocation,
  ParsedBooking,
  ParseError,
} from '../../types/import.types.js';
import { loadCsv } from './csv-parser.service.js';
import { normalize, getUniqueCustomers, getUniqueLocations, getBookings } from './data-normalizer.js';
import { getSupabaseClient } from '../../db/supabase.js';
import { logger } from '../../utils/logger.js';

/**
 * Error threshold for aborting import (10%)
 */
const ERROR_THRESHOLD_PERCENT = 10;

/**
 * Batch size for staging inserts
 */
const STAGING_BATCH_SIZE = 100;

/**
 * Creates a new import batch record.
 *
 * @param sourceFile - Name/path of the source file
 * @returns Created import batch
 */
export async function createBatch(sourceFile: string): Promise<ImportBatch> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('import_batches')
    .insert({
      source_file: sourceFile,
      status: 'processing',
      summary: {
        totalRows: 0,
        customersExtracted: 0,
        locationsExtracted: 0,
        bookingsGenerated: 0,
        errorsCount: 0,
        needsReviewCount: 0,
      },
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create import batch', { error: error.message });
    throw new Error(`Failed to create import batch: ${error.message}`);
  }

  logger.info('Import batch created', { batchId: data.id, sourceFile });

  return rowToBatch(data);
}

/**
 * Options for parseAndStage
 */
export interface ParseAndStageOptions {
  /** Maximum rows to process (for testing) */
  maxRows?: number;
}

/**
 * Parses CSV and populates staging tables.
 *
 * @param batchId - ID of the import batch
 * @param filePath - Path to the CSV file
 * @param options - Optional settings (maxRows for limiting rows)
 * @returns Import summary
 */
export async function parseAndStage(
  batchId: string,
  filePath: string,
  options: ParseAndStageOptions = {}
): Promise<ImportSummary> {
  const supabase = getSupabaseClient();

  try {
    // Load CSV
    logger.info('Loading CSV file', { batchId, filePath, maxRows: options.maxRows });
    const rows = await loadCsv(filePath, { maxRows: options.maxRows });
    const totalRows = rows.length;

    // Normalize data
    logger.info('Normalizing data', { batchId, rowCount: totalRows });
    const result = await normalize(rows);

    // Check error threshold
    const errorPercent = (result.errors.length / totalRows) * 100;
    if (errorPercent > ERROR_THRESHOLD_PERCENT) {
      await updateBatchStatus(batchId, 'failed', `Error threshold exceeded: ${errorPercent.toFixed(1)}% of rows failed`);
      throw new Error(`Import aborted: ${errorPercent.toFixed(1)}% of rows failed (threshold: ${ERROR_THRESHOLD_PERCENT}%)`);
    }

    // Write to staging tables
    logger.info('Writing to staging tables', { batchId });

    const customers = getUniqueCustomers(result);
    const locations = getUniqueLocations(result);
    const bookings = getBookings(result);

    // Insert customers to staging
    await insertStagingRecords(
      batchId,
      customers.map((c) => ({
        rowNumber: c.sourceRowNumbers[0] ?? 0,
        entityType: 'customer' as const,
        rawData: { displayName: c.displayName, sourceRowNumbers: c.sourceRowNumbers },
        parsedData: c,
      }))
    );

    // Insert locations to staging
    await insertStagingRecords(
      batchId,
      locations.map((l) => ({
        rowNumber: l.sourceRowNumbers[0] ?? 0,
        entityType: 'location' as const,
        rawData: { locationName: l.locationName, sourceRowNumbers: l.sourceRowNumbers },
        parsedData: l,
      }))
    );

    // Insert bookings to staging
    await insertStagingRecords(
      batchId,
      bookings.map((b) => {
        const rowIndex = b.sourceRowNumber - 2; // -2 for header and 1-indexed
        const rawRow = rowIndex >= 0 && rowIndex < rows.length ? rows[rowIndex] : null;
        return {
          rowNumber: b.sourceRowNumber,
          entityType: 'booking' as const,
          rawData: (rawRow || { sourceRowNumber: b.sourceRowNumber }) as Record<string, unknown>,
          parsedData: b,
        };
      })
    );

    // Insert errors to staging
    await insertErrorRecords(batchId, result.errors);

    // Count needs review
    const needsReviewCount = locations.filter((l) => l.tags.includes('Needs Review')).length;

    // Build summary
    const summary: ImportSummary = {
      totalRows,
      customersExtracted: customers.length,
      locationsExtracted: locations.length,
      bookingsGenerated: bookings.length,
      errorsCount: result.errors.length,
      needsReviewCount,
    };

    // Update batch status
    await supabase
      .from('import_batches')
      .update({
        status: 'staged',
        summary,
      })
      .eq('id', batchId);

    logger.info('Import staging complete', { batchId, summary });

    return summary;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await updateBatchStatus(batchId, 'failed', errorMessage);
    throw error;
  }
}

/**
 * Gets batch status and details.
 *
 * @param batchId - ID of the batch
 * @returns Import batch details
 */
export async function getBatchStatus(batchId: string): Promise<ImportBatch> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('import_batches')
    .select('*')
    .eq('id', batchId)
    .single();

  if (error) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  return rowToBatch(data);
}

/**
 * Lists recent import batches.
 *
 * @param limit - Maximum number of batches (default: 20)
 * @returns Array of import batches
 */
export async function listBatches(limit = 20): Promise<ImportBatch[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('import_batches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list batches: ${error.message}`);
  }

  return (data || []).map(rowToBatch);
}

/**
 * Gets staging records for a batch with pagination to handle large datasets.
 *
 * @param batchId - ID of the batch
 * @param entityType - Optional filter by entity type
 * @param status - Optional filter by status
 * @returns Array of staging records
 */
export async function getStagingRecords(
  batchId: string,
  entityType?: 'customer' | 'location' | 'booking',
  status?: 'pending' | 'committed' | 'error'
): Promise<StagingRecord[]> {
  const supabase = getSupabaseClient();
  const pageSize = 1000;
  const allRecords: StagingRecordRow[] = [];
  let offset = 0;

  // Paginate through all records to avoid Supabase's default limit
  while (true) {
    let query = supabase
      .from('import_staging')
      .select('*')
      .eq('batch_id', batchId)
      .order('row_number', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get staging records: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    allRecords.push(...data);

    if (data.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return allRecords.map(rowToStagingRecord);
}


/**
 * Exports batch data as JSON.
 *
 * @param batchId - ID of the batch
 * @returns JSON export of batch and staging data
 */
export async function exportBatchJson(batchId: string): Promise<{
  batch: ImportBatch;
  customers: StagingRecord[];
  locations: StagingRecord[];
  bookings: StagingRecord[];
  errors: StagingRecord[];
}> {
  const batch = await getBatchStatus(batchId);
  const customers = await getStagingRecords(batchId, 'customer');
  const locations = await getStagingRecords(batchId, 'location');
  const bookings = await getStagingRecords(batchId, 'booking');
  const errors = await getStagingRecords(batchId, undefined, 'error');

  return {
    batch,
    customers,
    locations,
    bookings,
    errors,
  };
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Updates batch status.
 */
async function updateBatchStatus(
  batchId: string,
  status: string,
  errorMessage?: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const updateData: Record<string, unknown> = { status };
  if (errorMessage) {
    updateData.error_message = errorMessage;
  }
  if (status === 'committed' || status === 'failed' || status === 'rolled_back') {
    updateData.processed_at = new Date().toISOString();
  }

  await supabase
    .from('import_batches')
    .update(updateData)
    .eq('id', batchId);
}

/**
 * Inserts staging records in batches.
 */
async function insertStagingRecords(
  batchId: string,
  records: Array<{
    rowNumber: number;
    entityType: 'customer' | 'location' | 'booking';
    rawData: Record<string, unknown>;
    parsedData: ParsedCustomer | ParsedLocation | ParsedBooking;
  }>
): Promise<void> {
  const supabase = getSupabaseClient();

  // Process in batches
  for (let i = 0; i < records.length; i += STAGING_BATCH_SIZE) {
    const batch = records.slice(i, i + STAGING_BATCH_SIZE);

    const insertData = batch.map((r) => ({
      batch_id: batchId,
      row_number: r.rowNumber,
      entity_type: r.entityType,
      raw_data: r.rawData,
      parsed_data: r.parsedData,
      status: 'pending',
    }));

    const { error } = await supabase
      .from('import_staging')
      .insert(insertData);

    if (error) {
      logger.error('Failed to insert staging records', {
        error: error.message,
        batchId,
        entityType: batch[0]?.entityType,
        count: batch.length,
      });
      throw new Error(`Failed to insert staging records: ${error.message}`);
    }
  }
}

/**
 * Inserts error records to staging.
 */
async function insertErrorRecords(
  batchId: string,
  errors: ParseError[]
): Promise<void> {
  if (errors.length === 0) {
    return;
  }

  const supabase = getSupabaseClient();

  // Process in batches
  for (let i = 0; i < errors.length; i += STAGING_BATCH_SIZE) {
    const batch = errors.slice(i, i + STAGING_BATCH_SIZE);

    const insertData = batch.map((e) => ({
      batch_id: batchId,
      row_number: e.rowNumber,
      entity_type: 'booking', // Default to booking for error rows
      raw_data: { error: true, rawValue: e.rawValue },
      parsed_data: { error: true, field: e.field, message: e.message },
      status: 'error',
      error_message: `${e.field}: ${e.message}`,
    }));

    const { error } = await supabase
      .from('import_staging')
      .insert(insertData);

    if (error) {
      logger.warn('Failed to insert error records', {
        error: error.message,
        batchId,
        count: batch.length,
      });
    }
  }
}

/**
 * Converts database row to ImportBatch.
 */
function rowToBatch(row: ImportBatchRow): ImportBatch {
  return {
    id: row.id,
    sourceFile: row.source_file,
    createdAt: new Date(row.created_at),
    status: row.status,
    processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
    summary: row.summary,
    createdBy: row.created_by || undefined,
    errorMessage: row.error_message || undefined,
  };
}

/**
 * Converts database row to StagingRecord.
 */
function rowToStagingRecord(row: StagingRecordRow): StagingRecord {
  return {
    id: row.id,
    batchId: row.batch_id,
    rowNumber: row.row_number,
    entityType: row.entity_type,
    rawData: row.raw_data,
    parsedData: row.parsed_data,
    status: row.status,
    targetId: row.target_id || undefined,
    errorMessage: row.error_message || undefined,
    createdAt: new Date(row.created_at),
  };
}
