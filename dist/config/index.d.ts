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
 * Route planning configuration
 */
export interface RoutePlanningConfig {
    enableClusteringV2: boolean;
    maxClusterRadiusMiles: number;
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
    baseUrl: string;
    dispatchApiKeys: string;
    database: {
        url: string | undefined;
    };
    supabase: SupabaseConfig;
    googleMaps: GoogleMapsConfig;
    routePlanning: RoutePlanningConfig;
    api: {
        prefix: string;
        version: string;
    };
}
/**
 * Application configuration singleton
 */
export declare const config: AppConfig;
/**
 * Validates that required configuration is present
 * Note: Uses console.error directly to avoid circular dependency with logger
 * @returns true if all required environment variables are set, false otherwise
 */
export declare function validateConfig(): boolean;
/**
 * Gets the current environment
 */
export declare function getEnvironment(): string;
/**
 * Checks if running in development mode
 */
export declare function isDevelopment(): boolean;
/**
 * Checks if running in production mode
 */
export declare function isProduction(): boolean;
/**
 * Checks if running in test mode
 */
export declare function isTest(): boolean;
/**
 * Checks if debug mode is enabled
 */
export declare function isDebugEnabled(): boolean;
export default config;
//# sourceMappingURL=index.d.ts.map