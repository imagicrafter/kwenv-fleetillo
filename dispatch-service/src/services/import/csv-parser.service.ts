/**
 * CSV Parser Service
 *
 * Issue #18: CSV Parser & Data Normalization for Legacy Import
 *
 * Handles loading and validating CSV files from the legacy system.
 * Uses csv-parse for streaming CSV parsing.
 */

import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { CsvRow, REQUIRED_CSV_COLUMNS } from '../../types/import.types.js';
import { logger } from '../../utils/logger.js';

/**
 * Result of CSV validation
 */
export interface CsvValidationResult {
  valid: boolean;
  headers: string[];
  missingColumns: string[];
  extraColumns: string[];
}

/**
 * Options for CSV loading
 */
export interface CsvLoadOptions {
  /** Skip empty rows (default: true) */
  skipEmpty?: boolean;
  /** Maximum rows to load (default: unlimited) */
  maxRows?: number;
}

/**
 * Validates that a CSV file has all required columns.
 *
 * @param filePath - Path to the CSV file
 * @returns Validation result
 */
export async function validateCsvColumns(filePath: string): Promise<CsvValidationResult> {
  return new Promise((resolve, reject) => {
    const results: CsvValidationResult = {
      valid: false,
      headers: [],
      missingColumns: [],
      extraColumns: [],
    };

    const parser = createReadStream(filePath).pipe(
      parse({
        columns: false,
        skip_empty_lines: true,
        trim: true,
        to_line: 1, // Only read header row
      })
    );

    parser.on('data', (row: string[]) => {
      results.headers = row;
    });

    parser.on('end', () => {
      // Check for missing columns
      const headerSet = new Set(results.headers);
      results.missingColumns = REQUIRED_CSV_COLUMNS.filter((col) => !headerSet.has(col));

      // Check for extra columns
      const requiredSet = new Set<string>(REQUIRED_CSV_COLUMNS);
      results.extraColumns = results.headers.filter((col) => !requiredSet.has(col));

      results.valid = results.missingColumns.length === 0;

      logger.debug('CSV validation complete', {
        valid: results.valid,
        headerCount: results.headers.length,
        missingCount: results.missingColumns.length,
        extraCount: results.extraColumns.length,
      });

      resolve(results);
    });

    parser.on('error', (error) => {
      logger.error('CSV validation failed', { error: error.message });
      reject(new Error(`Failed to validate CSV: ${error.message}`));
    });
  });
}

/**
 * Loads and parses a CSV file into typed rows.
 *
 * @param filePath - Path to the CSV file
 * @param options - Loading options
 * @returns Array of parsed CSV rows
 * @throws Error if required columns are missing
 */
export async function loadCsv(filePath: string, options: CsvLoadOptions = {}): Promise<CsvRow[]> {
  const { skipEmpty = true, maxRows } = options;

  // Validate columns first
  const validation = await validateCsvColumns(filePath);
  if (!validation.valid) {
    const errorMsg = `Missing required columns: ${validation.missingColumns.join(', ')}`;
    logger.error('CSV loading aborted', { error: errorMsg, missingColumns: validation.missingColumns });
    throw new Error(errorMsg);
  }

  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];
    let rowCount = 0;

    const parser = createReadStream(filePath).pipe(
      parse({
        columns: true,
        skip_empty_lines: skipEmpty,
        trim: true,
        relax_quotes: true,
        relax_column_count: true,
      })
    );

    parser.on('data', (row: CsvRow) => {
      if (maxRows && rowCount >= maxRows) {
        return;
      }

      rows.push(row);
      rowCount++;

      // Log progress for large files
      if (rowCount % 500 === 0) {
        logger.debug('CSV loading progress', { rowsLoaded: rowCount });
      }
    });

    parser.on('end', () => {
      logger.info('CSV loaded successfully', {
        filePath,
        totalRows: rows.length,
        skippedEmpty: skipEmpty,
      });
      resolve(rows);
    });

    parser.on('error', (error) => {
      logger.error('CSV loading failed', { error: error.message, filePath });
      reject(new Error(`Failed to load CSV: ${error.message}`));
    });
  });
}

/**
 * Counts rows in a CSV file without loading all data.
 *
 * @param filePath - Path to the CSV file
 * @returns Row count (excluding header)
 */
export async function countCsvRows(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    let count = 0;

    const parser = createReadStream(filePath).pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
      })
    );

    parser.on('data', () => {
      count++;
    });

    parser.on('end', () => {
      resolve(count);
    });

    parser.on('error', (error) => {
      reject(new Error(`Failed to count CSV rows: ${error.message}`));
    });
  });
}

/**
 * Validates a single row for completeness.
 *
 * @param row - CSV row to validate
 * @param rowNumber - Row number for error reporting
 * @returns Array of validation errors (empty if valid)
 */
export function validateRow(row: CsvRow, rowNumber: number): string[] {
  const errors: string[] = [];

  // Check required fields
  if (!row.Customer?.trim()) {
    errors.push(`Row ${rowNumber}: Customer field is empty`);
  }

  if (!row['Job/Est Date (next service date)']?.trim()) {
    errors.push(`Row ${rowNumber}: Job/Est Date field is empty`);
  }

  // Address validation (Service Location should be present)
  const hasAddress = row['Service Location']?.trim();
  if (!hasAddress) {
    errors.push(`Row ${rowNumber}: Service Location is empty`);
  }

  return errors;
}

/**
 * Gets a preview of the CSV file (first N rows).
 *
 * @param filePath - Path to the CSV file
 * @param previewRows - Number of rows to preview (default: 5)
 * @returns Preview rows and headers
 */
export async function previewCsv(
  filePath: string,
  previewRows = 5
): Promise<{ headers: string[]; rows: CsvRow[] }> {
  const validation = await validateCsvColumns(filePath);
  const rows = await loadCsv(filePath, { maxRows: previewRows });

  return {
    headers: validation.headers,
    rows,
  };
}
