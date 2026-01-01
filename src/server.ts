import { createApp } from './app.js';
import { config, validateConfig } from './config/index.js';
import { logger } from './utils/logger.js';
import { getSupabaseClient } from './services/supabase.js';

/**
 * Start the Express server
 */
const startServer = async () => {
  try {
    // Validate configuration
    logger.info('Validating configuration...');
    const configValidation = validateConfig();
    if (!configValidation) {
      logger.error('Configuration validation failed');
      process.exit(1);
    }

    logger.info('Configuration validated successfully');

    // Test database connection
    logger.info('Testing database connection...');
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('clients').select('count').limit(0);
      if (error) {
        throw error;
      }
      logger.info('Database connection successful');
    } catch (error) {
      logger.error('Database connection failed', { error });
      logger.warn('Server will start but database operations may fail');
    }

    // Create Express app
    const app = createApp();

    // Start HTTP server
    const port = config.port;
    const server = app.listen(port, () => {
      logger.info(`Server started successfully`, {
        port,
        environment: config.env,
        apiUrl: `http://localhost:${port}${config.api.prefix}/${config.api.version}`,
        healthCheck: `http://localhost:${port}/health`,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error, stack: error.stack, message: error.message });
      console.error('Uncaught Exception:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      shutdown('unhandledRejection');
    });

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Start the server
startServer();

export { startServer };
