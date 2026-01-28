/**
 * Commit Service
 *
 * Issue #18: CSV Parser & Data Normalization for Legacy Import
 *
 * Commits staged records to production tables.
 * Process order: Customers → Locations → Bookings
 * Supports rollback via target_id references.
 */

import {
  CommitResult,
  RollbackResult,
  StagingRecord,
  ParsedCustomer,
  ParsedLocation,
  ParsedBooking,
} from '../../types/import.types.js';
import { getStagingRecords, getBatchStatus } from './import.service.js';
import { getSupabaseClient } from '../../db/supabase.js';
import { logger } from '../../utils/logger.js';
import { createImportLogger } from '../../utils/import-logger.js';

/**
 * Commits all pending staging records to production.
 *
 * @param batchId - ID of the batch to commit
 * @returns Commit result with counts and errors
 */
export async function commitBatch(batchId: string): Promise<CommitResult & { logPaths?: { fullLogPath: string; errorLogPath: string } }> {
  const supabase = getSupabaseClient();
  const importLogger = createImportLogger(batchId, 'commit');

  // Verify batch status
  const batch = await getBatchStatus(batchId);
  if (batch.status === 'committed') {
    throw new Error('Batch has already been committed');
  }
  if (batch.status !== 'staged') {
    throw new Error(`Cannot commit batch with status: ${batch.status}`);
  }

  logger.info('Starting batch commit', { batchId });
  importLogger.info('batch', `Starting commit for batch ${batchId}`);
  importLogger.info('batch', `Expected: ${batch.summary.customersExtracted} customers, ${batch.summary.locationsExtracted} locations, ${batch.summary.bookingsGenerated} bookings`);

  const result: CommitResult & { logPaths?: { fullLogPath: string; errorLogPath: string } } = {
    success: true,
    customersCreated: 0,
    locationsCreated: 0,
    bookingsCreated: 0,
    errors: [],
  };

  // Map to track created entity IDs for foreign key resolution
  const customerIdMap = new Map<string, string>(); // normalizedName → customer_id
  const locationIdMap = new Map<string, string>(); // locationKey → location_id

  try {
    // Pre-populate maps with already-committed records (for resume scenarios)
    importLogger.info('batch', 'Loading already-committed records for resume support...');

    const committedCustomers = await getStagingRecords(batchId, 'customer', 'committed');
    for (const record of committedCustomers) {
      const parsedData = record.parsedData as ParsedCustomer;
      if (record.targetId) {
        customerIdMap.set(parsedData.normalizedName, record.targetId);
      }
    }
    importLogger.info('batch', `Loaded ${committedCustomers.length} committed customers into lookup map`);

    const committedLocations = await getStagingRecords(batchId, 'location', 'committed');
    for (const record of committedLocations) {
      const parsedData = record.parsedData as ParsedLocation;
      if (record.targetId) {
        const locationKey = `${parsedData.customerRef}|${parsedData.locationName}`;
        locationIdMap.set(locationKey, record.targetId);
      }
    }
    importLogger.info('batch', `Loaded ${committedLocations.length} committed locations into lookup map`);

    // Step 1: Commit customers
    importLogger.info('customer', '--- Starting customer commit ---');
    const customerRecords = await getStagingRecords(batchId, 'customer', 'pending');
    importLogger.info('customer', `Found ${customerRecords.length} pending customers`);

    for (let i = 0; i < customerRecords.length; i++) {
      const record = customerRecords[i];
      if (!record) continue;
      const parsedData = record.parsedData as ParsedCustomer;

      try {
        const customerId = await commitCustomer(record as StagingRecord<ParsedCustomer>);
        customerIdMap.set(parsedData.normalizedName, customerId);
        await updateStagingStatus(record.id, 'committed', customerId);
        result.customersCreated++;

        importLogger.success('customer', 'Created successfully', {
          entityId: customerId,
          entityName: parsedData.displayName,
          rowNumber: parsedData.sourceRowNumbers[0],
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push({ entityType: 'customer', id: record.id, error: errorMessage });
        await updateStagingStatus(record.id, 'commit_failed', undefined, errorMessage);

        importLogger.error('customer', 'Failed to create', errorMessage, {
          entityId: record.id,
          entityName: parsedData.displayName,
          rowNumber: parsedData.sourceRowNumbers[0],
          details: { normalizedName: parsedData.normalizedName },
        });
      }

      // Log progress every 50 records
      if ((i + 1) % 50 === 0) {
        importLogger.progress(i + 1, customerRecords.length, 'customer');
      }
    }
    importLogger.info('customer', `Completed: ${result.customersCreated} created, ${result.errors.length} errors`);

    // Step 2: Commit locations
    importLogger.info('location', '--- Starting location commit ---');
    const locationRecords = await getStagingRecords(batchId, 'location', 'pending');
    importLogger.info('location', `Found ${locationRecords.length} pending locations`);
    const locationErrorsBefore = result.errors.length;

    for (let i = 0; i < locationRecords.length; i++) {
      const record = locationRecords[i];
      if (!record) continue;
      const parsedData = record.parsedData as ParsedLocation;

      try {
        const customerId = customerIdMap.get(parsedData.customerRef);
        if (!customerId) {
          throw new Error(`Customer not found for location: ${parsedData.customerRef}`);
        }
        const locationId = await commitLocation(record as StagingRecord<ParsedLocation>, customerId);
        const locationKey = `${parsedData.customerRef}|${parsedData.locationName}`;
        locationIdMap.set(locationKey, locationId);
        await updateStagingStatus(record.id, 'committed', locationId);
        result.locationsCreated++;

        importLogger.success('location', 'Created successfully', {
          entityId: locationId,
          entityName: parsedData.locationName,
          rowNumber: parsedData.sourceRowNumbers[0],
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push({ entityType: 'location', id: record.id, error: errorMessage });
        await updateStagingStatus(record.id, 'commit_failed', undefined, errorMessage);

        importLogger.error('location', 'Failed to create', errorMessage, {
          entityId: record.id,
          entityName: parsedData.locationName,
          rowNumber: parsedData.sourceRowNumbers[0],
          details: { customerRef: parsedData.customerRef, address: parsedData.address.fullAddress },
        });
      }

      // Log progress every 100 records
      if ((i + 1) % 100 === 0) {
        importLogger.progress(i + 1, locationRecords.length, 'location');
      }
    }
    const locationErrors = result.errors.length - locationErrorsBefore;
    importLogger.info('location', `Completed: ${result.locationsCreated} created, ${locationErrors} errors`);

    // Step 3: Commit bookings
    importLogger.info('booking', '--- Starting booking commit ---');
    const bookingRecords = await getStagingRecords(batchId, 'booking', 'pending');
    importLogger.info('booking', `Found ${bookingRecords.length} pending bookings`);
    const bookingErrorsBefore = result.errors.length;

    for (let i = 0; i < bookingRecords.length; i++) {
      const record = bookingRecords[i];
      if (!record) continue;
      const parsedData = record.parsedData as ParsedBooking;

      try {
        const locationId = locationIdMap.get(parsedData.locationRef);
        if (!locationId) {
          throw new Error(`Location not found for booking: ${parsedData.locationRef}`);
        }
        const bookingId = await commitBooking(record as StagingRecord<ParsedBooking>, locationId);
        await updateStagingStatus(record.id, 'committed', bookingId);
        result.bookingsCreated++;

        importLogger.success('booking', 'Created successfully', {
          entityId: bookingId,
          rowNumber: parsedData.sourceRowNumber,
          details: { scheduledDate: parsedData.scheduledDate, locationRef: parsedData.locationRef },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push({ entityType: 'booking', id: record.id, error: errorMessage });
        await updateStagingStatus(record.id, 'commit_failed', undefined, errorMessage);

        importLogger.error('booking', 'Failed to create', errorMessage, {
          entityId: record.id,
          rowNumber: parsedData.sourceRowNumber,
          details: { locationRef: parsedData.locationRef, scheduledDate: parsedData.scheduledDate },
        });
      }

      // Log progress every 200 records
      if ((i + 1) % 200 === 0) {
        importLogger.progress(i + 1, bookingRecords.length, 'booking');
      }
    }
    const bookingErrors = result.errors.length - bookingErrorsBefore;
    importLogger.info('booking', `Completed: ${result.bookingsCreated} created, ${bookingErrors} errors`);

    // Update batch status
    if (result.errors.length === 0) {
      await supabase
        .from('import_batches')
        .update({
          status: 'committed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', batchId);
      importLogger.info('batch', 'Batch status updated to: committed');
    } else {
      result.success = false;
      importLogger.warn('batch', 'Batch has errors, status remains: staged (retry possible)', {
        details: { errorCount: result.errors.length },
      });
    }

    // Finalize logs
    const logResult = importLogger.finalize(result.success);
    result.logPaths = {
      fullLogPath: logResult.fullLogPath,
      errorLogPath: logResult.errorLogPath,
    };

    logger.info('Batch commit complete', {
      batchId,
      customersCreated: result.customersCreated,
      locationsCreated: result.locationsCreated,
      bookingsCreated: result.bookingsCreated,
      errors: result.errors.length,
      logPaths: result.logPaths,
    });

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Batch commit failed', { batchId, error: errorMessage });
    importLogger.error('batch', 'Batch commit failed with exception', errorMessage);

    const logResult = importLogger.finalize(false);

    result.success = false;
    result.errors.push({ entityType: 'customer', id: batchId, error: errorMessage });
    result.logPaths = {
      fullLogPath: logResult.fullLogPath,
      errorLogPath: logResult.errorLogPath,
    };
    return result;
  }
}

/**
 * Rolls back a committed batch by deleting created records.
 *
 * @param batchId - ID of the batch to rollback
 * @returns Rollback result
 */
export async function rollbackBatch(batchId: string): Promise<RollbackResult> {
  const supabase = getSupabaseClient();

  const batch = await getBatchStatus(batchId);
  if (batch.status !== 'committed') {
    throw new Error(`Cannot rollback batch with status: ${batch.status}`);
  }

  logger.info('Starting batch rollback', { batchId });

  const result: RollbackResult = {
    success: true,
    recordsDeleted: 0,
    errors: [],
  };

  try {
    // Rollback in reverse order: Bookings → Locations → Customers

    // Get all committed staging records with target_ids
    const { data: records, error: fetchError } = await supabase
      .from('import_staging')
      .select('id, entity_type, target_id')
      .eq('batch_id', batchId)
      .eq('status', 'committed')
      .not('target_id', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch committed records: ${fetchError.message}`);
    }

    // Group by entity type
    const bookings = records?.filter((r) => r.entity_type === 'booking') || [];
    const locations = records?.filter((r) => r.entity_type === 'location') || [];
    const customers = records?.filter((r) => r.entity_type === 'customer') || [];

    // Delete bookings first
    for (const record of bookings) {
      try {
        await supabase.from('bookings').delete().eq('id', record.target_id);
        await updateStagingStatus(record.id, 'pending');
        result.recordsDeleted++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to delete booking ${record.target_id}: ${errorMessage}`);
      }
    }

    // Delete locations
    for (const record of locations) {
      try {
        await supabase.from('locations').delete().eq('id', record.target_id);
        await updateStagingStatus(record.id, 'pending');
        result.recordsDeleted++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to delete location ${record.target_id}: ${errorMessage}`);
      }
    }

    // Delete customers
    for (const record of customers) {
      try {
        await supabase.from('customers').delete().eq('id', record.target_id);
        await updateStagingStatus(record.id, 'pending');
        result.recordsDeleted++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to delete customer ${record.target_id}: ${errorMessage}`);
      }
    }

    // Update batch status
    await supabase
      .from('import_batches')
      .update({ status: 'rolled_back' })
      .eq('id', batchId);

    result.success = result.errors.length === 0;

    logger.info('Batch rollback complete', {
      batchId,
      recordsDeleted: result.recordsDeleted,
      errors: result.errors.length,
    });

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Batch rollback failed', { batchId, error: errorMessage });
    result.success = false;
    result.errors.push(errorMessage);
    return result;
  }
}

// ============================================================================
// Internal Commit Functions
// ============================================================================

/**
 * Commits a customer to the customers table.
 */
async function commitCustomer(record: StagingRecord<ParsedCustomer>): Promise<string> {
  const supabase = getSupabaseClient();
  const data = record.parsedData;

  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      name: data.displayName,
      company_name: data.displayName,
      status: 'active',
      tags: ['imported'],
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create customer: ${error.message}`);
  }

  return customer.id;
}

/**
 * Commits a location to the locations table.
 */
async function commitLocation(
  record: StagingRecord<ParsedLocation>,
  customerId: string
): Promise<string> {
  const supabase = getSupabaseClient();
  const data = record.parsedData;

  const insertData: Record<string, unknown> = {
    customer_id: customerId,
    name: data.locationName,
    location_type: 'client',
    address_line1: data.address.street,
    city: data.address.city,
    state: data.address.state,
    postal_code: data.address.zipCode,
    tags: data.tags.length > 0 ? data.tags : ['imported'],
    metadata: data.metadata,
    notes: data.notes,
  };

  // Add coordinates if available
  if (data.coordinates) {
    insertData.latitude = data.coordinates.lat;
    insertData.longitude = data.coordinates.lng;
  }

  const { data: location, error } = await supabase
    .from('locations')
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create location: ${error.message}`);
  }

  return location.id;
}

/**
 * Commits a booking to the bookings table.
 */
async function commitBooking(
  record: StagingRecord<ParsedBooking>,
  locationId: string
): Promise<string> {
  const supabase = getSupabaseClient();
  const data = record.parsedData;

  // Get customer_id from location
  const { data: location, error: locError } = await supabase
    .from('locations')
    .select('customer_id')
    .eq('id', locationId)
    .single();

  if (locError || !location) {
    throw new Error(`Failed to get customer for location: ${locationId}`);
  }

  const insertData: Record<string, unknown> = {
    customer_id: location.customer_id,
    location_id: locationId,
    scheduled_date: data.scheduledDate,
    status: data.appStatus,
    crm_status: data.crmStatus,
    crm_id: data.crmId,
    booking_type: 'one_time',
    tags: ['imported'],
  };

  // Add driver if matched
  if (data.driverId) {
    // Note: bookings don't have a direct driver_id field
    // Driver assignment happens through routes
    insertData.tags = ['imported', `driver:${data.driverId}`];
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create booking: ${error.message}`);
  }

  return booking.id;
}

/**
 * Updates staging record status.
 */
async function updateStagingStatus(
  recordId: string,
  status: string,
  targetId?: string,
  errorMessage?: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const updateData: Record<string, unknown> = { status };
  if (targetId) {
    updateData.target_id = targetId;
  }
  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  await supabase
    .from('import_staging')
    .update(updateData)
    .eq('id', recordId);
}
