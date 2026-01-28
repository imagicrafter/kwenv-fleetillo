/**
 * Notes Field Parser Utility
 *
 * Issue #18: CSV Parser & Data Normalization for Legacy Import
 *
 * Extracts structured metadata from freeform notes field.
 *
 * Supported patterns:
 * - hose:N → metadata.hoseLengthReq (equipment needed to reach trap)
 * - Tanker: Yes|No → metadata.requiresTanker (whether tanker truck required)
 * - ServiceTime: ... → metadata.preferredServiceTime (access/timing constraints)
 *
 * Remaining text after extraction is preserved as location notes.
 */

import { NotesParseResult, LocationMetadata } from '../types/import.types.js';

/**
 * Pattern for hose length requirement
 * Matches: "hose:30", "hose: 30", "Hose:30"
 */
const HOSE_PATTERN = /hose:\s*(\d+)/i;

/**
 * Pattern for tanker requirement
 * Matches: "Tanker: Yes", "tanker:No", "TANKER: yes"
 */
const TANKER_PATTERN = /tanker:\s*(yes|no)/i;

/**
 * Pattern for service time preference
 * Matches: "ServiceTime: pump before 11 AM", "servicetime:morning only"
 * Captures text until next pattern or end of string
 */
const SERVICE_TIME_PATTERN = /servicetime:\s*(.+?)(?=hose:|tanker:|$)/i;

/**
 * Parses the Notes field to extract structured metadata.
 *
 * @param notes - The raw Notes field from CSV
 * @returns Parsed result with extracted metadata and remaining notes
 *
 * @example
 * parseNotes("hose:30 Tanker: Yes ServiceTime: pump before 11 AM")
 * // Returns: {
 * //   metadata: { hoseLengthReq: 30, requiresTanker: true, preferredServiceTime: "pump before 11 AM" },
 * //   remainingNotes: ""
 * // }
 *
 * @example
 * parseNotes("Call customer on arrival. hose:50")
 * // Returns: {
 * //   metadata: { hoseLengthReq: 50 },
 * //   remainingNotes: "Call customer on arrival."
 * // }
 */
export function parseNotes(notes: string): NotesParseResult {
  if (!notes || typeof notes !== 'string') {
    return {
      metadata: {},
      remainingNotes: '',
    };
  }

  const metadata: Partial<LocationMetadata> = {};
  let workingNotes = notes.trim();

  // Extract hose length
  const hoseMatch = workingNotes.match(HOSE_PATTERN);
  if (hoseMatch && hoseMatch[1]) {
    const hoseLength = parseInt(hoseMatch[1], 10);
    if (!isNaN(hoseLength) && hoseLength > 0) {
      metadata.hoseLengthReq = hoseLength;
    }
    // Remove matched pattern from working notes
    workingNotes = workingNotes.replace(HOSE_PATTERN, '').trim();
  }

  // Extract tanker requirement
  const tankerMatch = workingNotes.match(TANKER_PATTERN);
  if (tankerMatch && tankerMatch[1]) {
    metadata.requiresTanker = tankerMatch[1].toLowerCase() === 'yes';
    // Remove matched pattern from working notes
    workingNotes = workingNotes.replace(TANKER_PATTERN, '').trim();
  }

  // Extract service time preference
  const serviceTimeMatch = workingNotes.match(SERVICE_TIME_PATTERN);
  if (serviceTimeMatch && serviceTimeMatch[1]) {
    const serviceTime = serviceTimeMatch[1].trim();
    if (serviceTime) {
      metadata.preferredServiceTime = serviceTime;
    }
    // Remove matched pattern from working notes
    workingNotes = workingNotes.replace(SERVICE_TIME_PATTERN, '').trim();
  }

  // Clean up remaining notes
  const remainingNotes = cleanRemainingNotes(workingNotes);

  return {
    metadata,
    remainingNotes,
  };
}

/**
 * Cleans up remaining notes after metadata extraction.
 * - Removes multiple spaces
 * - Removes leading/trailing whitespace
 * - Removes orphaned punctuation
 *
 * @param notes - Notes string after pattern removal
 * @returns Cleaned notes string
 */
function cleanRemainingNotes(notes: string): string {
  if (!notes) {
    return '';
  }

  return notes
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .replace(/^\s*[.,;:]\s*/, '') // Remove leading punctuation
    .replace(/\s*[.,;:]\s*$/, '') // Remove trailing punctuation
    .trim();
}

/**
 * Validates extracted hose length is reasonable.
 *
 * @param length - Hose length in feet
 * @returns True if within reasonable range (10-500 feet)
 */
export function isReasonableHoseLength(length: number): boolean {
  return length >= 10 && length <= 500;
}

/**
 * Extracts all metadata patterns from notes without modifying.
 * Useful for validation and preview.
 *
 * @param notes - The raw Notes field
 * @returns Object with all detected patterns
 */
export function detectPatterns(notes: string): {
  hasHose: boolean;
  hasTanker: boolean;
  hasServiceTime: boolean;
} {
  if (!notes || typeof notes !== 'string') {
    return {
      hasHose: false,
      hasTanker: false,
      hasServiceTime: false,
    };
  }

  return {
    hasHose: HOSE_PATTERN.test(notes),
    hasTanker: TANKER_PATTERN.test(notes),
    hasServiceTime: SERVICE_TIME_PATTERN.test(notes),
  };
}
