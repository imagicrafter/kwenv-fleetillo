/**
 * Customer (Brand) Extraction Utility
 *
 * Issue #18: CSV Parser & Data Normalization for Legacy Import
 *
 * Extracts customer brand names from DKW-prefixed location identifiers.
 * The CSV "Customer" field actually contains location identifiers like:
 * - "DKW-Applebee's #1025138" → Brand: "Applebee's"
 * - "DKW-BCS - College Park Elementary" → Brand: "BCS"
 * - "DKW-Doc's BBQ" → Brand: "Doc's BBQ"
 */

import { CustomerExtractionResult } from '../types/import.types.js';

/** Prefix to strip from customer field */
const DKW_PREFIX = 'DKW-';

/**
 * Extracts the customer brand from a DKW-prefixed location identifier.
 *
 * Algorithm:
 * 1. Strip "DKW-" prefix
 * 2. If "#" exists: Brand = text before "#"
 * 3. Else if " - " exists: Brand = text before " - "
 * 4. Else: Brand = full remaining string
 *
 * @param customerField - The raw customer field from CSV
 * @returns Extraction result with brand and normalized name
 *
 * @example
 * extractCustomer("DKW-Applebee's #1025138")
 * // Returns: { brand: "Applebee's", normalized: "APPLEBEES" }
 *
 * @example
 * extractCustomer("DKW-BCS - College Park Elementary")
 * // Returns: { brand: "BCS", normalized: "BCS" }
 */
export function extractCustomer(customerField: string): CustomerExtractionResult {
  if (!customerField || typeof customerField !== 'string') {
    return { brand: '', normalized: '' };
  }

  // Strip DKW- prefix
  let workingString = customerField.trim();
  if (workingString.startsWith(DKW_PREFIX)) {
    workingString = workingString.slice(DKW_PREFIX.length);
  }

  // Extract brand using separator hierarchy
  let brand: string;

  // Check for "#" separator (franchise/store number)
  const hashIndex = workingString.indexOf('#');
  if (hashIndex > 0) {
    brand = workingString.slice(0, hashIndex).trim();
  }
  // Check for " - " separator (subunit/department)
  else {
    const dashIndex = workingString.indexOf(' - ');
    if (dashIndex > 0) {
      brand = workingString.slice(0, dashIndex).trim();
    } else {
      // No separator - use full string
      brand = workingString.trim();
    }
  }

  // Normalize for matching
  const normalized = normalizeBrandName(brand);

  return { brand, normalized };
}

/**
 * Extracts the full location name from a DKW-prefixed string.
 * This is everything after the "DKW-" prefix.
 *
 * @param customerField - The raw customer field from CSV
 * @returns The location name
 *
 * @example
 * extractLocationName("DKW-Applebee's #1025138")
 * // Returns: "Applebee's #1025138"
 */
export function extractLocationName(customerField: string): string {
  if (!customerField || typeof customerField !== 'string') {
    return '';
  }

  let workingString = customerField.trim();
  if (workingString.startsWith(DKW_PREFIX)) {
    workingString = workingString.slice(DKW_PREFIX.length);
  }

  return workingString.trim();
}

/**
 * Normalizes a brand name for matching and deduplication.
 * - Converts to uppercase
 * - Trims whitespace
 * - Removes common special characters (apostrophes, etc.)
 * - Collapses multiple spaces
 *
 * @param brand - The brand name to normalize
 * @returns Normalized brand name
 *
 * @example
 * normalizeBrandName("Applebee's") // Returns: "APPLEBEES"
 * normalizeBrandName("Doc's BBQ") // Returns: "DOCS BBQ"
 */
export function normalizeBrandName(brand: string): string {
  if (!brand || typeof brand !== 'string') {
    return '';
  }

  return brand
    .toUpperCase()
    .trim()
    .replace(/['`'"]/g, '') // Remove apostrophes and quotes
    .replace(/\s+/g, ' '); // Collapse multiple spaces
}

/**
 * Generates a unique key for a location (for deduplication).
 * Key format: normalized_customer_name|location_name
 *
 * @param normalizedCustomer - Normalized customer name
 * @param locationName - Full location name
 * @returns Unique location key
 */
export function generateLocationKey(normalizedCustomer: string, locationName: string): string {
  return `${normalizedCustomer}|${locationName.trim()}`;
}
