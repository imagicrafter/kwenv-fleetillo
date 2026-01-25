/**
 * API Key Authentication Middleware
 *
 * Validates API key authentication for protected endpoints.
 * Used for dispatch service integration with route token creation.
 */
import { Request, Response, NextFunction } from 'express';
export declare const API_KEY_HEADER = "X-API-Key";
/**
 * Get configured API keys from environment variable.
 * API keys are stored as a comma-separated list in DISPATCH_API_KEYS.
 *
 * @returns Set of valid API keys
 */
export declare function getConfiguredApiKeys(): Set<string>;
/**
 * Validate an API key against configured keys.
 *
 * @param apiKey - The API key to validate
 * @returns true if the key is valid, false otherwise
 */
export declare function isValidApiKey(apiKey: string | undefined): boolean;
/**
 * Middleware that validates API key authentication.
 *
 * Checks for the X-API-Key header and validates it against
 * the configured API keys in DISPATCH_API_KEYS environment variable.
 *
 * Returns 401 Unauthorized if:
 * - The X-API-Key header is missing
 * - The API key is invalid
 * - No API keys are configured
 */
export declare function apiKeyAuth(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=api-key-auth.d.ts.map