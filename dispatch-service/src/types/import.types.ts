/**
 * Type definitions for CSV Import Pipeline
 *
 * Issue #18: CSV Parser & Data Normalization for Legacy Import
 *
 * This module defines the data structures for:
 * - Import batch tracking
 * - Staging records
 * - Parsed entities (customers, locations, bookings)
 * - CSV row structure
 */

// ============================================================================
// Import Batch Types
// ============================================================================

/**
 * Status values for import batches
 */
export type ImportBatchStatus =
  | 'processing' // Currently parsing/staging
  | 'staged' // Ready for review
  | 'committed' // Successfully committed to production
  | 'failed' // Parsing or commit failed
  | 'rolled_back'; // Committed then rolled back

/**
 * Summary statistics for an import batch
 */
export interface ImportSummary {
  totalRows: number;
  customersExtracted: number;
  locationsExtracted: number;
  bookingsGenerated: number;
  errorsCount: number;
  needsReviewCount: number;
}

/**
 * Import batch record
 */
export interface ImportBatch {
  id: string;
  sourceFile: string;
  createdAt: Date;
  status: ImportBatchStatus;
  processedAt?: Date;
  summary: ImportSummary;
  createdBy?: string;
  errorMessage?: string;
}

/**
 * Database row type for import_batches (snake_case)
 */
export interface ImportBatchRow {
  id: string;
  source_file: string;
  created_at: string;
  status: ImportBatchStatus;
  processed_at: string | null;
  summary: ImportSummary;
  created_by: string | null;
  error_message: string | null;
}

// ============================================================================
// Staging Record Types
// ============================================================================

/**
 * Entity types stored in staging
 */
export type StagingEntityType = 'customer' | 'location' | 'booking';

/**
 * Status values for staging records
 */
export type StagingRecordStatus =
  | 'pending' // Ready for commit
  | 'committed' // Successfully committed
  | 'error' // Parse error
  | 'commit_failed' // Commit attempt failed
  | 'skipped'; // Intentionally skipped

/**
 * Staging record
 */
export interface StagingRecord<T = ParsedCustomer | ParsedLocation | ParsedBooking> {
  id: string;
  batchId: string;
  rowNumber: number;
  entityType: StagingEntityType;
  rawData: Record<string, unknown>;
  parsedData: T;
  status: StagingRecordStatus;
  targetId?: string;
  errorMessage?: string;
  createdAt: Date;
}

/**
 * Database row type for import_staging (snake_case)
 */
export interface StagingRecordRow {
  id: string;
  batch_id: string;
  row_number: number;
  entity_type: StagingEntityType;
  raw_data: Record<string, unknown>;
  parsed_data: ParsedCustomer | ParsedLocation | ParsedBooking;
  status: StagingRecordStatus;
  target_id: string | null;
  error_message: string | null;
  created_at: string;
}

// ============================================================================
// Parsed Entity Types
// ============================================================================

/**
 * Parsed customer (brand) record
 */
export interface ParsedCustomer {
  /** Uppercase, trimmed, normalized for matching */
  normalizedName: string;
  /** Original casing for display */
  displayName: string;
  /** All CSV rows that contributed to this customer */
  sourceRowNumbers: number[];
}

/**
 * Location metadata extracted from notes and gallons fields
 */
export interface LocationMetadata {
  /** Trap capacity in gallons */
  capacityGallons?: number;
  /** Number of traps at location */
  trapCount?: number;
  /** Raw capacity value if unparseable */
  capacityNotes?: string;
  /** Required hose length in feet */
  hoseLengthReq?: number;
  /** Whether tanker truck is required */
  requiresTanker?: boolean;
  /** Preferred service time/window */
  preferredServiceTime?: string;
}

/**
 * Address structure
 */
export interface ParsedAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  fullAddress: string;
}

/**
 * Parsed location record
 */
export interface ParsedLocation {
  /** Normalized customer name (for linking) */
  customerRef: string;
  /** Full location name after DKW- prefix */
  locationName: string;
  /** Structured address */
  address: ParsedAddress;
  /** Geocoded coordinates (if available) */
  coordinates?: { lat: number; lng: number };
  /** Extracted metadata */
  metadata: LocationMetadata;
  /** Tags (e.g., 'Needs Review') */
  tags: string[];
  /** Remaining notes after metadata extraction */
  notes?: string;
  /** All CSV rows that reference this location */
  sourceRowNumbers: number[];
}

/**
 * App status values for bookings
 */
export type AppBookingStatus = 'confirmed' | 'scheduled' | 'completed';

/**
 * CRM status values for bookings
 */
export type CrmBookingStatus = 'SCHEDULED' | 'DISPATCHED' | 'COMPLETED';

/**
 * Parsed booking record
 */
export interface ParsedBooking {
  /** Reference key: customerNormalizedName + '|' + locationName */
  locationRef: string;
  /** Matched driver ID (if found) */
  driverId?: string;
  /** Unmatched driver name (for logging) */
  unmatchedDriverName?: string;
  /** ISO date string */
  scheduledDate: string;
  /** App-internal status */
  appStatus: AppBookingStatus;
  /** CRM status code */
  crmStatus: CrmBookingStatus;
  /** Unique identifier: SHA256(customer + "|" + location + "|" + date + "|" + driver) */
  crmId: string;
  /** Source CSV row number */
  sourceRowNumber: number;
}

// ============================================================================
// CSV Row Type
// ============================================================================

/**
 * Expected columns in the legacy CSV file
 *
 * Actual columns in the file:
 * Name, Job/Est Date (next service date), Status, Customer, Service Location, Gallons, Notes For Techs, Frequency
 */
export interface CsvRow {
  /** Driver name */
  Name: string;
  /** Scheduled date */
  'Job/Est Date (next service date)': string;
  /** Booking status (Scheduled, Dispatched, Completed, etc.) */
  Status: string;
  /** Contains location identifier (e.g., "DKW-Applebee's #1025138") */
  Customer: string;
  /** Full address as a string (e.g., "505 N Belair Rd Evans, GA 30809") */
  'Service Location': string;
  /** Capacity info (e.g., "500", "1000", "2- 2000") */
  Gallons: string;
  /** Notes containing metadata patterns */
  'Notes For Techs': string;
  /** Service frequency (optional) */
  Frequency?: string;
}

/**
 * Required columns that must exist in the CSV
 */
export const REQUIRED_CSV_COLUMNS: string[] = [
  'Name',
  'Job/Est Date (next service date)',
  'Status',
  'Customer',
  'Service Location',
  'Gallons',
  'Notes For Techs',
];

// ============================================================================
// Processing Types
// ============================================================================

/**
 * Error encountered during parsing
 */
export interface ParseError {
  rowNumber: number;
  field: string;
  message: string;
  rawValue?: string;
}

/**
 * Result of the normalization process
 */
export interface NormalizationResult {
  customers: Map<string, ParsedCustomer>;
  locations: Map<string, ParsedLocation>;
  bookings: ParsedBooking[];
  errors: ParseError[];
}

/**
 * Result of the commit process
 */
export interface CommitResult {
  success: boolean;
  customersCreated: number;
  locationsCreated: number;
  bookingsCreated: number;
  errors: Array<{ entityType: StagingEntityType; id: string; error: string }>;
}

/**
 * Result of the rollback process
 */
export interface RollbackResult {
  success: boolean;
  recordsDeleted: number;
  errors: string[];
}

// ============================================================================
// Extraction Result Types
// ============================================================================

/**
 * Result of customer extraction
 */
export interface CustomerExtractionResult {
  brand: string;
  normalized: string;
}

/**
 * Result of gallons parsing
 */
export interface GallonsParseResult {
  capacityGallons?: number;
  trapCount?: number;
  capacityNotes?: string;
  needsReview: boolean;
}

/**
 * Result of notes parsing
 */
export interface NotesParseResult {
  metadata: Partial<LocationMetadata>;
  remainingNotes: string;
}

/**
 * Result of driver matching
 */
export interface DriverMatchResult {
  driverId?: string;
  confidence: number;
  matchedName?: string;
}
