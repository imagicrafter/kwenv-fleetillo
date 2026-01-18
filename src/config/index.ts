import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
// Supports environment-specific files: .env.local, .env.development, .env.production
const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), envFile) });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Supabase configuration
 */
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  schema: string;
}

/**
 * Google Maps API configuration
 */
export interface GoogleMapsConfig {
  apiKey?: string;
}

/**
 * Application configuration
 * Centralized configuration management for the RouteIQ application
 */
export interface AppConfig {
  env: string;
  port: number;
  logLevel: string;
  debug: boolean;
  database: {
    url: string | undefined;
  };
  supabase: SupabaseConfig;
  googleMaps: GoogleMapsConfig;
  api: {
    prefix: string;
    version: string;
  };
}

/**
 * Helper function to get required environment variable
 * Throws an error if the variable is not set
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Helper function to get optional environment variable with default
 */
function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

/**
 * Helper function to parse boolean environment variable
 */
function getBooleanEnv(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Helper function to parse integer environment variable
 */
function getIntEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Creates the application configuration object
 * This function is used to lazily create the config to support testing
 */
function createConfig(): AppConfig {
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
export const config: AppConfig = createConfig();

/**
 * List of required environment variables for validation
 */
const REQUIRED_ENV_VARS = ['SUPABASE_URL', 'SUPABASE_KEY'] as const;

/**
 * Validates that required configuration is present
 * Note: Uses console.error directly to avoid circular dependency with logger
 * @returns true if all required environment variables are set, false otherwise
 */
export function validateConfig(): boolean {
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
function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the current environment
 */
export function getEnvironment(): string {
  return config.env;
}

/**
 * Checks if running in development mode
 */
export function isDevelopment(): boolean {
  return config.env === 'development';
}

/**
 * Checks if running in production mode
 */
export function isProduction(): boolean {
  return config.env === 'production';
}

/**
 * Checks if running in test mode
 */
export function isTest(): boolean {
  return config.env === 'test';
}

/**
 * Checks if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  return config.debug;
}

export default config;
