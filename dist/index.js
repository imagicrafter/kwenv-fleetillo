"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.validateConfig = exports.config = void 0;
const index_1 = require("./config/index");
Object.defineProperty(exports, "config", { enumerable: true, get: function () { return index_1.config; } });
Object.defineProperty(exports, "validateConfig", { enumerable: true, get: function () { return index_1.validateConfig; } });
const logger_1 = require("./utils/logger");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return logger_1.logger; } });
/**
 * RouteIQ TypeScript Application
 * Main entry point
 */
function main() {
    // Create a context-specific logger for the main module
    const appLogger = (0, logger_1.createContextLogger)('App');
    appLogger.info('RouteIQ TypeScript Application');
    // Validate configuration before starting
    if (!(0, index_1.validateConfig)()) {
        appLogger.error('Configuration validation failed. Please check your .env file.');
        process.exit(1);
    }
    appLogger.info('Application starting', {
        environment: index_1.config.env,
        nodeVersion: process.version,
        logLevel: index_1.config.logLevel,
        port: index_1.config.port,
        debug: index_1.config.debug,
    });
    // Log additional debug information in development mode
    if ((0, index_1.isDevelopment)() && (0, index_1.isDebugEnabled)()) {
        appLogger.debug('Configuration Details (Debug Mode)', {
            supabaseUrl: index_1.config.supabase.url,
            supabaseSchema: index_1.config.supabase.schema,
            googleMapsConfigured: !!index_1.config.googleMaps.apiKey,
            apiPrefix: index_1.config.api.prefix,
            apiVersion: index_1.config.api.version,
        });
    }
    appLogger.info('Application started successfully!');
}
// Run the application
main();
// Re-export error handling module
__exportStar(require("./errors/index"), exports);
//# sourceMappingURL=index.js.map