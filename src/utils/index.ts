/**
 * Utility functions for RouteIQ application
 */

// Re-export logger utilities
export * from './logger';

/**
 * Sleep utility for async operations
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safely parse JSON with error handling
 * @param json - JSON string to parse
 * @returns Parsed object or null if parsing fails
 */
export function safeJsonParse<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Check if a value is defined (not null or undefined)
 * @param value - Value to check
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Generate a simple unique ID
 * Note: For production, use a proper UUID library
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Deep clone an object
 * @param obj - Object to clone
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}
