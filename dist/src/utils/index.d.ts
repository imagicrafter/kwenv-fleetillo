/**
 * Utility functions for RouteIQ application
 */
export * from './logger.js';
/**
 * Sleep utility for async operations
 * @param ms - Milliseconds to sleep
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Safely parse JSON with error handling
 * @param json - JSON string to parse
 * @returns Parsed object or null if parsing fails
 */
export declare function safeJsonParse<T>(json: string): T | null;
/**
 * Check if a value is defined (not null or undefined)
 * @param value - Value to check
 */
export declare function isDefined<T>(value: T | null | undefined): value is T;
/**
 * Generate a simple unique ID
 * Note: For production, use a proper UUID library
 */
export declare function generateId(): string;
/**
 * Deep clone an object
 * @param obj - Object to clone
 */
export declare function deepClone<T>(obj: T): T;
//# sourceMappingURL=index.d.ts.map