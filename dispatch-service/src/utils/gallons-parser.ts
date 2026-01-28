/**
 * Gallons Field Parser Utility
 *
 * Issue #18: CSV Parser & Data Normalization for Legacy Import
 *
 * Parses the Gallons field from legacy CSV to extract trap capacity information.
 *
 * Supported formats:
 * - Simple number: "1500" → { capacityGallons: 1500 }
 * - Multi-trap: "2- 2000" → { trapCount: 2, capacityGallons: 2000 }
 * - Variations: "2-1500", "2 - 1500", "2- 1500"
 * - Unrecognized: stored as capacityNotes with needsReview flag
 */

import { GallonsParseResult } from '../types/import.types.js';

/**
 * Pattern for multi-trap format: "N- CAPACITY" or "N-CAPACITY" or "N - CAPACITY"
 * Group 1: trap count
 * Group 2: capacity in gallons
 */
const MULTI_TRAP_PATTERN = /^(\d+)\s*-\s*(\d+)$/;

/**
 * Pattern for simple number
 */
const SIMPLE_NUMBER_PATTERN = /^\d+$/;

/**
 * Parses the Gallons field to extract capacity information.
 *
 * @param gallons - The raw Gallons field from CSV
 * @returns Parsed result with capacity info and review flag
 *
 * @example
 * parseGallons("1500")
 * // Returns: { capacityGallons: 1500, needsReview: false }
 *
 * @example
 * parseGallons("2- 2000")
 * // Returns: { trapCount: 2, capacityGallons: 2000, needsReview: false }
 *
 * @example
 * parseGallons("varies by season")
 * // Returns: { capacityNotes: "varies by season", needsReview: true }
 */
export function parseGallons(gallons: string): GallonsParseResult {
  if (!gallons || typeof gallons !== 'string') {
    return { needsReview: false };
  }

  const trimmed = gallons.trim();

  if (!trimmed) {
    return { needsReview: false };
  }

  // Try simple number format
  if (SIMPLE_NUMBER_PATTERN.test(trimmed)) {
    const capacity = parseInt(trimmed, 10);
    if (!isNaN(capacity) && capacity > 0) {
      return {
        capacityGallons: capacity,
        needsReview: false,
      };
    }
  }

  // Try multi-trap format
  const multiTrapMatch = trimmed.match(MULTI_TRAP_PATTERN);
  if (multiTrapMatch && multiTrapMatch[1] && multiTrapMatch[2]) {
    const trapCount = parseInt(multiTrapMatch[1], 10);
    const capacity = parseInt(multiTrapMatch[2], 10);

    if (!isNaN(trapCount) && !isNaN(capacity) && trapCount > 0 && capacity > 0) {
      return {
        trapCount,
        capacityGallons: capacity,
        needsReview: false,
      };
    }
  }

  // Unrecognized format - store raw value and flag for review
  return {
    capacityNotes: trimmed,
    needsReview: true,
  };
}

/**
 * Validates if a gallons value is reasonable.
 * Used for sanity checking parsed values.
 *
 * @param gallons - Capacity in gallons
 * @returns True if value is within reasonable range
 */
export function isReasonableCapacity(gallons: number): boolean {
  // Reasonable range: 50 to 50,000 gallons
  return gallons >= 50 && gallons <= 50000;
}

/**
 * Validates if a trap count is reasonable.
 *
 * @param count - Number of traps
 * @returns True if value is within reasonable range
 */
export function isReasonableTrapCount(count: number): boolean {
  // Reasonable range: 1 to 20 traps
  return count >= 1 && count <= 20;
}
