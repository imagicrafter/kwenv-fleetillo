"use strict";
/**
 * API Key Authentication Middleware
 *
 * Validates API key authentication for protected endpoints.
 * Used for dispatch service integration with route token creation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_KEY_HEADER = void 0;
exports.getConfiguredApiKeys = getConfiguredApiKeys;
exports.isValidApiKey = isValidApiKey;
exports.apiKeyAuth = apiKeyAuth;
const index_1 = require("../config/index");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createContextLogger)('ApiKeyAuth');
exports.API_KEY_HEADER = 'X-API-Key';
/**
 * Get configured API keys from environment variable.
 * API keys are stored as a comma-separated list in DISPATCH_API_KEYS.
 *
 * @returns Set of valid API keys
 */
function getConfiguredApiKeys() {
    const apiKeysEnv = index_1.config.dispatchApiKeys || '';
    // Split by comma and filter out empty strings
    const keys = apiKeysEnv
        .split(',')
        .map((key) => key.trim())
        .filter((key) => key.length > 0);
    return new Set(keys);
}
/**
 * Validate an API key against configured keys.
 *
 * @param apiKey - The API key to validate
 * @returns true if the key is valid, false otherwise
 */
function isValidApiKey(apiKey) {
    if (!apiKey || apiKey.trim().length === 0) {
        return false;
    }
    const configuredKeys = getConfiguredApiKeys();
    // If no keys are configured, reject all requests
    if (configuredKeys.size === 0) {
        logger.warn('No API keys configured - all requests will be rejected');
        return false;
    }
    return configuredKeys.has(apiKey.trim());
}
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
function apiKeyAuth(req, res, next) {
    const apiKey = req.headers[exports.API_KEY_HEADER.toLowerCase()];
    // Check if API key header is present
    if (!apiKey) {
        logger.warn('Missing API key', {
            path: req.path,
            method: req.method,
        });
        res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Missing API key. Please provide a valid API key in the X-API-Key header.',
            },
        });
        return;
    }
    // Validate the API key
    if (!isValidApiKey(apiKey)) {
        logger.warn('Invalid API key', {
            path: req.path,
            method: req.method,
            keyLength: apiKey.length,
        });
        res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Invalid API key. Please provide a valid API key.',
            },
        });
        return;
    }
    // API key is valid, proceed to next middleware
    logger.debug('API key validated', {
        path: req.path,
        method: req.method,
    });
    next();
}
//# sourceMappingURL=api-key-auth.js.map