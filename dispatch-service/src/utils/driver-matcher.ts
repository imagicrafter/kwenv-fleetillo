/**
 * Driver Matching Utility
 *
 * Issue #18: CSV Parser & Data Normalization for Legacy Import
 *
 * Fuzzy matches driver names from CSV against existing driver records.
 * Uses Fuse.js for fuzzy string matching with configurable threshold.
 */

import Fuse, { IFuseOptions } from 'fuse.js';
import { DriverMatchResult } from '../types/import.types.js';
import { getSupabaseClient } from '../db/supabase.js';
import { logger } from './logger.js';

/**
 * Minimum similarity score for a match (0 to 1, where 1 is exact match)
 * Using 0.2 as threshold because Fuse.js uses distance (lower = better match)
 */
const MATCH_THRESHOLD = 0.4;

/**
 * Fuse.js configuration for name matching
 */
const FUSE_OPTIONS: IFuseOptions<DriverRecord> = {
  keys: ['fullName', 'firstName', 'lastName'],
  threshold: MATCH_THRESHOLD,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

/**
 * Internal driver record structure
 */
interface DriverRecord {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

/**
 * Cached driver list for matching
 */
let driverCache: DriverRecord[] | null = null;
let fuseInstance: Fuse<DriverRecord> | null = null;

/**
 * Loads drivers from database and initializes the fuzzy matcher.
 *
 * @returns Array of driver records
 */
async function loadDrivers(): Promise<DriverRecord[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('drivers')
    .select('id, first_name, last_name')
    .is('deleted_at', null)
    .eq('status', 'active');

  if (error) {
    logger.error('Failed to load drivers for matching', { error: error.message });
    throw new Error(`Failed to load drivers: ${error.message}`);
  }

  const drivers: DriverRecord[] = (data || []).map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`,
  }));

  logger.debug('Loaded drivers for matching', { count: drivers.length });

  return drivers;
}

/**
 * Initializes or refreshes the driver cache and Fuse instance.
 *
 * @param forceRefresh - Force reload from database
 */
export async function initializeDriverMatcher(forceRefresh = false): Promise<void> {
  if (driverCache && fuseInstance && !forceRefresh) {
    return;
  }

  driverCache = await loadDrivers();
  fuseInstance = new Fuse(driverCache, FUSE_OPTIONS);

  logger.info('Driver matcher initialized', {
    driverCount: driverCache.length,
    threshold: MATCH_THRESHOLD,
  });
}

/**
 * Resets the driver cache (useful for testing).
 */
export function resetDriverCache(): void {
  driverCache = null;
  fuseInstance = null;
}

/**
 * Matches a driver name from CSV against existing drivers.
 *
 * @param driverName - The driver name from CSV (e.g., "John Smith")
 * @returns Match result with driver ID and confidence
 *
 * @example
 * await matchDriver("John Smith")
 * // Returns: { driverId: "uuid", confidence: 0.95, matchedName: "John Smith" }
 *
 * @example
 * await matchDriver("Jon Smth") // typo
 * // Returns: { driverId: "uuid", confidence: 0.7, matchedName: "John Smith" }
 *
 * @example
 * await matchDriver("Unknown Person")
 * // Returns: { confidence: 0 }
 */
export async function matchDriver(driverName: string): Promise<DriverMatchResult> {
  if (!driverName || typeof driverName !== 'string') {
    return { confidence: 0 };
  }

  // Ensure matcher is initialized
  if (!fuseInstance || !driverCache) {
    await initializeDriverMatcher();
  }

  if (!fuseInstance) {
    logger.warn('Driver matcher not available');
    return { confidence: 0 };
  }

  const trimmedName = driverName.trim();
  if (!trimmedName) {
    return { confidence: 0 };
  }

  // Perform fuzzy search
  const results = fuseInstance.search(trimmedName);

  if (results.length === 0) {
    logger.debug('No driver match found', { searchName: trimmedName });
    return { confidence: 0 };
  }

  // Get best match
  const bestMatch = results[0];
  if (!bestMatch) {
    return { confidence: 0 };
  }

  // Fuse.js score is distance (0 = perfect match, 1 = no match)
  // Convert to confidence (1 = perfect match, 0 = no match)
  const confidence = 1 - (bestMatch.score ?? 0);

  // Only accept if confidence is above threshold
  if (confidence < 1 - MATCH_THRESHOLD) {
    logger.debug('Driver match below threshold', {
      searchName: trimmedName,
      bestMatch: bestMatch.item.fullName,
      confidence,
      threshold: 1 - MATCH_THRESHOLD,
    });
    return { confidence };
  }

  logger.debug('Driver matched', {
    searchName: trimmedName,
    matchedName: bestMatch.item.fullName,
    driverId: bestMatch.item.id,
    confidence,
  });

  return {
    driverId: bestMatch.item.id,
    confidence,
    matchedName: bestMatch.item.fullName,
  };
}

/**
 * Batch matches multiple driver names.
 * More efficient than calling matchDriver individually.
 *
 * @param driverNames - Array of driver names
 * @returns Map of input name to match result
 */
export async function matchDriversBatch(
  driverNames: string[]
): Promise<Map<string, DriverMatchResult>> {
  // Ensure matcher is initialized
  if (!fuseInstance || !driverCache) {
    await initializeDriverMatcher();
  }

  const results = new Map<string, DriverMatchResult>();

  for (const name of driverNames) {
    if (!results.has(name)) {
      const result = await matchDriver(name);
      results.set(name, result);
    }
  }

  return results;
}

/**
 * Gets the list of loaded drivers.
 * Useful for debugging and validation.
 *
 * @returns Array of loaded driver records
 */
export function getLoadedDrivers(): DriverRecord[] {
  return driverCache || [];
}
