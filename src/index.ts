import { config, validateConfig, isDevelopment, isDebugEnabled } from './config/index';
import { logger, createContextLogger } from './utils/logger';

/**
 * RouteIQ TypeScript Application
 * Main entry point
 */

function main(): void {
  // Create a context-specific logger for the main module
  const appLogger = createContextLogger('App');

  appLogger.info('RouteIQ TypeScript Application');

  // Validate configuration before starting
  if (!validateConfig()) {
    appLogger.error('Configuration validation failed. Please check your .env file.');
    process.exit(1);
  }

  appLogger.info('Application starting', {
    environment: config.env,
    nodeVersion: process.version,
    logLevel: config.logLevel,
    port: config.port,
    debug: config.debug,
  });

  // Log additional debug information in development mode
  if (isDevelopment() && isDebugEnabled()) {
    appLogger.debug('Configuration Details (Debug Mode)', {
      supabaseUrl: config.supabase.url,
      supabaseSchema: config.supabase.schema,
      googleMapsConfigured: !!config.googleMaps.apiKey,
      apiPrefix: config.api.prefix,
      apiVersion: config.api.version,
    });
  }

  appLogger.info('Application started successfully!');
}

// Run the application
main();

export { config, validateConfig, logger };

// Re-export error handling module
export * from './errors/index';
