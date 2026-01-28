/**
 * Data Normalizer Service
 *
 * Issue #18: CSV Parser & Data Normalization for Legacy Import
 *
 * Processes CSV rows to extract and normalize:
 * - Customers (brands) from location identifiers
 * - Locations with addresses and metadata
 * - Bookings with status mapping and driver matching
 */

import { createHash } from 'crypto';
import {
  CsvRow,
  ParsedCustomer,
  ParsedLocation,
  ParsedBooking,
  ParsedAddress,
  LocationMetadata,
  ParseError,
  NormalizationResult,
  AppBookingStatus,
  CrmBookingStatus,
} from '../../types/import.types.js';
import {
  extractCustomer,
  extractLocationName,
  generateLocationKey,
} from '../../utils/customer-extractor.js';
import { parseGallons } from '../../utils/gallons-parser.js';
import { parseNotes } from '../../utils/notes-parser.js';
import { matchDriver, initializeDriverMatcher } from '../../utils/driver-matcher.js';
import { logger } from '../../utils/logger.js';

/**
 * Maps CSV status to app status
 */
const STATUS_MAP: Record<string, { app: AppBookingStatus; crm: CrmBookingStatus }> = {
  scheduled: { app: 'confirmed', crm: 'SCHEDULED' },
  dispatched: { app: 'scheduled', crm: 'DISPATCHED' },
  completed: { app: 'completed', crm: 'COMPLETED' },
  'closed and complete': { app: 'completed', crm: 'COMPLETED' },
};

/**
 * Default status if not mapped
 */
const DEFAULT_STATUS = { app: 'confirmed' as AppBookingStatus, crm: 'SCHEDULED' as CrmBookingStatus };

/**
 * Processes all CSV rows into normalized entities.
 *
 * @param rows - Array of CSV rows
 * @returns Normalized customers, locations, bookings, and errors
 */
export async function normalize(rows: CsvRow[]): Promise<NormalizationResult> {
  const customers = new Map<string, ParsedCustomer>();
  const locations = new Map<string, ParsedLocation>();
  const bookings: ParsedBooking[] = [];
  const errors: ParseError[] = [];

  // Initialize driver matcher
  await initializeDriverMatcher();

  logger.info('Starting data normalization', { rowCount: rows.length });

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // +2 for 1-indexed and header row
    const row = rows[i];

    if (!row) {
      continue;
    }

    try {
      // Extract customer
      const customerResult = extractCustomer(row.Customer);
      if (!customerResult.normalized) {
        errors.push({
          rowNumber,
          field: 'Customer',
          message: 'Could not extract customer brand',
          rawValue: row.Customer,
        });
        continue;
      }

      // Update or create customer
      const existingCustomer = customers.get(customerResult.normalized);
      if (existingCustomer) {
        customers.set(customerResult.normalized, {
          ...existingCustomer,
          sourceRowNumbers: [...existingCustomer.sourceRowNumbers, rowNumber],
        });
      } else {
        customers.set(customerResult.normalized, {
          normalizedName: customerResult.normalized,
          displayName: customerResult.brand,
          sourceRowNumbers: [rowNumber],
        });
      }

      // Extract location
      const locationName = extractLocationName(row.Customer);
      const locationKey = generateLocationKey(customerResult.normalized, locationName);

      const existingLocation = locations.get(locationKey);
      if (existingLocation) {
        // Update existing location with new row reference
        locations.set(locationKey, {
          ...existingLocation,
          sourceRowNumbers: [...existingLocation.sourceRowNumbers, rowNumber],
        });
      } else {
        // Create new location
        const location = await processLocation(row, customerResult.normalized, locationName, rowNumber);
        locations.set(locationKey, location);
      }

      // Create booking
      const booking = await processBooking(row, customerResult.normalized, locationName, rowNumber);
      bookings.push(booking);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({
        rowNumber,
        field: 'unknown',
        message: `Unexpected error: ${errorMessage}`,
      });
      logger.warn('Row processing failed', { rowNumber, error: errorMessage });
    }
  }

  logger.info('Normalization complete', {
    customers: customers.size,
    locations: locations.size,
    bookings: bookings.length,
    errors: errors.length,
  });

  return { customers, locations, bookings, errors };
}

/**
 * Processes a location from a CSV row.
 */
async function processLocation(
  row: CsvRow,
  customerRef: string,
  locationName: string,
  rowNumber: number
): Promise<ParsedLocation> {
  const address = parseAddress(row);
  const gallonsResult = parseGallons(row.Gallons);
  const notesResult = parseNotes(row['Notes For Techs']);

  // Build metadata
  const metadata: LocationMetadata = {
    ...notesResult.metadata,
  };

  if (gallonsResult.capacityGallons) {
    metadata.capacityGallons = gallonsResult.capacityGallons;
  }
  if (gallonsResult.trapCount) {
    metadata.trapCount = gallonsResult.trapCount;
  }
  if (gallonsResult.capacityNotes) {
    metadata.capacityNotes = gallonsResult.capacityNotes;
  }

  // Build tags
  const tags: string[] = [];
  if (gallonsResult.needsReview) {
    tags.push('Needs Review');
  }

  return {
    customerRef,
    locationName,
    address,
    metadata,
    tags,
    notes: notesResult.remainingNotes || undefined,
    sourceRowNumbers: [rowNumber],
  };
}

/**
 * Processes a booking from a CSV row.
 */
async function processBooking(
  row: CsvRow,
  customerNormalized: string,
  locationName: string,
  rowNumber: number
): Promise<ParsedBooking> {
  const locationRef = generateLocationKey(customerNormalized, locationName);

  // Map status
  const statusKey = row.Status?.toLowerCase().trim() || '';
  const status = STATUS_MAP[statusKey] || DEFAULT_STATUS;

  // Parse date
  const scheduledDate = parseDate(row['Job/Est Date (next service date)']);

  // Match driver
  const driverMatch = await matchDriver(row.Name);

  // Generate CRM ID
  const crmId = generateCrmId(
    customerNormalized,
    locationName,
    scheduledDate,
    row.Name
  );

  const booking: ParsedBooking = {
    locationRef,
    scheduledDate,
    appStatus: status.app,
    crmStatus: status.crm,
    crmId,
    sourceRowNumber: rowNumber,
  };

  if (driverMatch.driverId) {
    booking.driverId = driverMatch.driverId;
  } else if (row.Name?.trim()) {
    booking.unmatchedDriverName = row.Name.trim();
    logger.debug('Unmatched driver name', { name: row.Name, rowNumber });
  }

  return booking;
}

/**
 * Parses address from CSV row.
 * The "Service Location" field contains a full address like:
 * "505 N Belair Rd Evans, GA 30809" or "437 Killian Rd Columbia, South Carolina 29203-9608"
 */
function parseAddress(row: CsvRow): ParsedAddress {
  const fullAddress = row['Service Location']?.trim() || '';

  // Try to parse address components
  // Pattern: "street address city, state zip"
  // Split by comma - usually the last part has "state zip"
  const parts = fullAddress.split(',').map((p) => p.trim());

  let street = '';
  let city = '';
  let state = '';
  let zipCode = '';

  if (parts.length >= 2) {
    // Last part should be "STATE ZIP" or "State ZIP"
    const lastPart = parts[parts.length - 1] || '';

    // Try to extract state and zip from last part
    // Patterns: "GA 30809", "South Carolina 29203-9608", "SC 12345"
    const stateZipMatch = lastPart.match(/^([A-Za-z\s]+?)\s*(\d{5}(?:-\d{4})?)?\s*$/);
    if (stateZipMatch) {
      state = stateZipMatch[1]?.trim() || '';
      zipCode = stateZipMatch[2] || '';
    } else {
      // If no match, treat the whole thing as state
      state = lastPart;
    }

    // Second to last part is typically the city
    if (parts.length >= 2) {
      // The first part contains "street city"
      const firstPart = parts.slice(0, parts.length - 1).join(', ');
      // Try to split street from city - the city is usually the last word(s) before the comma
      // This is tricky, so we'll put everything in street and city together
      const streetParts = firstPart.split(' ');
      if (streetParts.length > 2) {
        // Assume last word before comma is city
        city = streetParts[streetParts.length - 1] || '';
        street = streetParts.slice(0, -1).join(' ');
      } else {
        street = firstPart;
      }
    }
  } else {
    // Single part - just use as street
    street = fullAddress;
  }

  return {
    street,
    city,
    state,
    zipCode,
    fullAddress,
  };
}

/**
 * Extracts date portion from ISO string.
 */
function extractDatePortion(date: Date): string {
  const iso = date.toISOString();
  const datePart = iso.split('T')[0];
  return datePart ?? iso.substring(0, 10);
}

/**
 * Parses date from various formats.
 * Returns ISO date string (YYYY-MM-DD).
 */
function parseDate(dateStr: string): string {
  if (!dateStr) {
    return extractDatePortion(new Date());
  }

  const trimmed = dateStr.trim();

  // Try various date formats
  const formats = [
    // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // MM-DD-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
  ];

  for (const format of formats) {
    const match = trimmed.match(format);
    if (match) {
      try {
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) {
          return extractDatePortion(date);
        }
      } catch {
        // Continue to next format
      }
    }
  }

  // Fallback: try native Date parsing
  try {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return extractDatePortion(date);
    }
  } catch {
    // Ignore
  }

  // Return current date if parsing fails
  logger.warn('Could not parse date, using current date', { rawDate: dateStr });
  return extractDatePortion(new Date());
}

/**
 * Generates a unique CRM ID for a booking.
 * SHA256 hash of: customer + "|" + location + "|" + date + "|" + driver
 */
function generateCrmId(
  customer: string,
  location: string,
  date: string,
  driver: string
): string {
  const input = `${customer}|${location}|${date}|${driver || 'unknown'}`;
  const hash = createHash('sha256').update(input).digest('hex');
  return hash.slice(0, 32); // Use first 32 chars for readability
}

/**
 * Gets unique customers from normalization result.
 */
export function getUniqueCustomers(
  result: NormalizationResult
): ParsedCustomer[] {
  return Array.from(result.customers.values());
}

/**
 * Gets unique locations from normalization result.
 */
export function getUniqueLocations(
  result: NormalizationResult
): ParsedLocation[] {
  return Array.from(result.locations.values());
}

/**
 * Gets bookings from normalization result.
 */
export function getBookings(result: NormalizationResult): ParsedBooking[] {
  return result.bookings;
}
