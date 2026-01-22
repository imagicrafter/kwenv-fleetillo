"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = void 0;
const app_1 = require("./app");
const index_1 = require("./config/index");
const logger_1 = require("./utils/logger");
const supabase_1 = require("./services/supabase");
/**
 * Start the Express server
 */
const startServer = async () => {
    try {
        // Validate configuration
        logger_1.logger.info('Validating configuration...');
        const configValidation = (0, index_1.validateConfig)();
        if (!configValidation) {
            logger_1.logger.error('Configuration validation failed');
            process.exit(1);
        }
        logger_1.logger.info('Configuration validated successfully');
        // Test database connection
        logger_1.logger.info('Testing database connection...');
        try {
            const supabase = (0, supabase_1.getSupabaseClient)();
            const { error } = await supabase.from('customers').select('count').limit(0);
            if (error) {
                throw error;
            }
            logger_1.logger.info('Database connection successful');
        }
        catch (error) {
            logger_1.logger.error('Database connection failed', { error });
            logger_1.logger.warn('Server will start but database operations may fail');
        }
        // Create Express app
        const app = (0, app_1.createApp)();
        // Start HTTP server
        const port = index_1.config.port;
        const server = app.listen(port, () => {
            logger_1.logger.info(`Server started successfully`, {
                port,
                environment: index_1.config.env,
                apiUrl: `http://localhost:${port}${index_1.config.api.prefix}/${index_1.config.api.version}`,
                healthCheck: `http://localhost:${port}/health`,
            });
        });
        // Graceful shutdown
        const shutdown = async (signal) => {
            logger_1.logger.info(`${signal} received, shutting down gracefully...`);
            server.close(() => {
                logger_1.logger.info('HTTP server closed');
                process.exit(0);
            });
            // Force shutdown after 10 seconds
            setTimeout(() => {
                logger_1.logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };
        // Handle shutdown signals
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        // Handle uncaught errors
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('Uncaught exception', { error, stack: error.stack, message: error.message });
            console.error('Uncaught Exception:', error);
            shutdown('uncaughtException');
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.error('Unhandled rejection', { reason, promise });
            shutdown('unhandledRejection');
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server', { error });
        process.exit(1);
    }
};
exports.startServer = startServer;
// Start the server
startServer();
//# sourceMappingURL=server.js.map