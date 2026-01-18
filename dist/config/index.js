"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.validateConfig = validateConfig;
exports.getEnvironment = getEnvironment;
exports.isDevelopment = isDevelopment;
exports.isProduction = isProduction;
exports.isTest = isTest;
exports.isDebugEnabled = isDebugEnabled;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from .env file
// Supports environment-specific files: .env.local, .env.development, .env.production
const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env';
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), envFile) });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env.local') });
/**
 * Helper function to get required environment variable
 * Throws an error if the variable is not set
 */
function getRequiredEnv(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
/**
 * Helper function to get optional environment variable with default
 */
function getOptionalEnv(key, defaultValue) {
    return process.env[key] ?? defaultValue;
}
/**
 * Helper function to parse boolean environment variable
 */
function getBooleanEnv(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined)
        return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
}
/**
 * Helper function to parse integer environment variable
 */
function getIntEnv(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined)
        return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}
/**
 * Creates the application configuration object
 * This function is used to lazily create the config to support testing
 */
function createConfig() {
    return {
        env: getOptionalEnv('NODE_ENV', 'development'),
        port: getIntEnv('PORT', 3000),
        logLevel: getOptionalEnv('LOG_LEVEL', 'info'),
        debug: getBooleanEnv('DEBUG', false),
        database: {
            url: process.env.DATABASE_URL,
        },
        supabase: {
            url: getRequiredEnv('SUPABASE_URL'),
            anonKey: getRequiredEnv('SUPABASE_KEY'),
            serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            schema: getOptionalEnv('SUPABASE_SCHEMA', 'optiroute'),
        },
        googleMaps: {
            apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
        api: {
            prefix: getOptionalEnv('API_PREFIX', '/api'),
            version: getOptionalEnv('API_VERSION', 'v1'),
        },
    };
}
/**
 * Application configuration singleton
 */
exports.config = createConfig();
/**
 * List of required environment variables for validation
 */
const REQUIRED_ENV_VARS = ['SUPABASE_URL', 'SUPABASE_KEY'];
/**
 * Validates that required configuration is present
 * Note: Uses console.error directly to avoid circular dependency with logger
 * @returns true if all required environment variables are set, false otherwise
 */
function validateConfig() {
    const missing = REQUIRED_ENV_VARS.filter(envVar => !process.env[envVar]);
    if (missing.length > 0) {
        // eslint-disable-next-line no-console
        console.error(`Missing required environment variables: ${missing.join(', ')}`);
        return false;
    }
    // Additional validation for URL format
    const supabaseUrl = process.env.SUPABASE_URL;
    if (supabaseUrl && !isValidUrl(supabaseUrl)) {
        // eslint-disable-next-line no-console
        console.error('SUPABASE_URL must be a valid URL');
        return false;
    }
    return true;
}
/**
 * Validates that a string is a valid URL
 */
function isValidUrl(urlString) {
    try {
        new URL(urlString);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Gets the current environment
 */
function getEnvironment() {
    return exports.config.env;
}
/**
 * Checks if running in development mode
 */
function isDevelopment() {
    return exports.config.env === 'development';
}
/**
 * Checks if running in production mode
 */
function isProduction() {
    return exports.config.env === 'production';
}
/**
 * Checks if running in test mode
 */
function isTest() {
    return exports.config.env === 'test';
}
/**
 * Checks if debug mode is enabled
 */
function isDebugEnabled() {
    return exports.config.debug;
}
exports.default = exports.config;
//# sourceMappingURL=index.js.map