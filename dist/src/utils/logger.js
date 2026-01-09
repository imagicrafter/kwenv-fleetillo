"use strict";
/**
 * Comprehensive logging framework for RouteIQ application
 *
 * Provides structured logging with different log levels (debug, info, warn, error),
 * context support, and environment-aware formatting.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.logger = void 0;
exports.createLogger = createLogger;
exports.createContextLogger = createContextLogger;
const index_js_1 = require("../config/index.js");
/**
 * Numeric values for log levels for comparison
 */
const LOG_LEVEL_VALUES = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
/**
 * ANSI color codes for terminal output
 */
const COLORS = {
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
};
/**
 * Color mapping for each log level
 */
const LEVEL_COLORS = {
    debug: COLORS.dim,
    info: COLORS.blue,
    warn: COLORS.yellow,
    error: COLORS.red,
};
/**
 * Default logger configuration
 */
const DEFAULT_CONFIG = {
    level: 'info',
    format: 'pretty',
    includeTimestamp: true,
    includeContext: true,
    colorize: true,
};
/**
 * Logger class implementing the ILogger interface
 * Provides comprehensive logging with different levels and formatting options
 */
class Logger {
    config;
    context;
    /**
     * Creates a new Logger instance
     * @param configOverrides - Optional configuration overrides
     * @param context - Optional context string for the logger
     */
    constructor(configOverrides, context) {
        const envLevel = index_js_1.config.logLevel;
        const isProduction = index_js_1.config.env === 'production';
        this.config = {
            ...DEFAULT_CONFIG,
            level: envLevel || DEFAULT_CONFIG.level,
            format: isProduction ? 'json' : 'pretty',
            colorize: !isProduction,
            ...configOverrides,
        };
        this.context = context;
    }
    /**
     * Checks if the given level should be logged based on current config
     */
    shouldLog(level) {
        return LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES[this.config.level];
    }
    /**
     * Formats a timestamp for log output
     */
    formatTimestamp() {
        return new Date().toISOString();
    }
    /**
     * Formats the log level string with padding
     */
    formatLevel(level) {
        return level.toUpperCase().padEnd(5);
    }
    /**
     * Colorizes text if colorization is enabled
     */
    colorize(text, color) {
        if (!this.config.colorize)
            return text;
        return `${color}${text}${COLORS.reset}`;
    }
    /**
     * Serializes an error object for logging
     */
    serializeError(error) {
        if (error instanceof Error) {
            return {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        }
        return {
            name: 'UnknownError',
            message: String(error),
        };
    }
    /**
     * Creates a log entry object
     */
    createLogEntry(level, message, metadata, error) {
        const entry = {
            timestamp: this.formatTimestamp(),
            level,
            message,
        };
        if (this.context && this.config.includeContext) {
            entry.context = this.context;
        }
        if (metadata && Object.keys(metadata).length > 0) {
            entry.metadata = metadata;
        }
        if (error) {
            entry.error = this.serializeError(error);
        }
        return entry;
    }
    /**
     * Formats a log entry for pretty console output
     */
    formatPretty(entry) {
        const parts = [];
        // Timestamp
        if (this.config.includeTimestamp) {
            parts.push(this.colorize(entry.timestamp, COLORS.dim));
        }
        // Level
        const levelColor = LEVEL_COLORS[entry.level];
        parts.push(this.colorize(`[${this.formatLevel(entry.level)}]`, levelColor));
        // Context
        if (entry.context) {
            parts.push(this.colorize(`[${entry.context}]`, COLORS.cyan));
        }
        // Message
        parts.push(entry.message);
        // Metadata
        if (entry.metadata) {
            const metadataStr = JSON.stringify(entry.metadata);
            parts.push(this.colorize(metadataStr, COLORS.dim));
        }
        let output = parts.join(' ');
        // Error stack
        if (entry.error?.stack) {
            output += '\n' + this.colorize(entry.error.stack, COLORS.red);
        }
        return output;
    }
    /**
     * Formats a log entry as JSON for structured logging
     */
    formatJson(entry) {
        return JSON.stringify(entry);
    }
    /**
     * Outputs the log entry to the console
     */
    output(level, entry) {
        const formatted = this.config.format === 'json' ? this.formatJson(entry) : this.formatPretty(entry);
        // Use appropriate console method - eslint-disable comments needed here
        switch (level) {
            case 'debug':
                // eslint-disable-next-line no-console
                console.debug(formatted);
                break;
            case 'info':
                // eslint-disable-next-line no-console
                console.info(formatted);
                break;
            case 'warn':
                // eslint-disable-next-line no-console
                console.warn(formatted);
                break;
            case 'error':
                // eslint-disable-next-line no-console
                console.error(formatted);
                break;
        }
    }
    /**
     * Logs a debug message
     * @param message - The message to log
     * @param metadata - Optional metadata to attach
     */
    debug(message, metadata) {
        if (!this.shouldLog('debug'))
            return;
        const entry = this.createLogEntry('debug', message, metadata);
        this.output('debug', entry);
    }
    /**
     * Logs an info message
     * @param message - The message to log
     * @param metadata - Optional metadata to attach
     */
    info(message, metadata) {
        if (!this.shouldLog('info'))
            return;
        const entry = this.createLogEntry('info', message, metadata);
        this.output('info', entry);
    }
    /**
     * Logs a warning message
     * @param message - The message to log
     * @param metadata - Optional metadata to attach
     */
    warn(message, metadata) {
        if (!this.shouldLog('warn'))
            return;
        const entry = this.createLogEntry('warn', message, metadata);
        this.output('warn', entry);
    }
    /**
     * Logs an error message
     * @param message - The message to log
     * @param error - Optional error object to include
     * @param metadata - Optional metadata to attach
     */
    error(message, error, metadata) {
        if (!this.shouldLog('error'))
            return;
        const entry = this.createLogEntry('error', message, metadata, error);
        this.output('error', entry);
    }
    /**
     * Creates a child logger with a specific context
     * @param context - The context for the child logger
     * @returns A new Logger instance with the given context
     */
    child(context) {
        const childContext = this.context ? `${this.context}:${context}` : context;
        return new Logger(this.config, childContext);
    }
    /**
     * Sets the log level
     * @param level - The new log level
     */
    setLevel(level) {
        this.config.level = level;
    }
    /**
     * Gets the current log level
     * @returns The current log level
     */
    getLevel() {
        return this.config.level;
    }
}
exports.Logger = Logger;
/**
 * Singleton logger instance for application-wide logging
 */
exports.logger = new Logger();
/**
 * Factory function to create a new logger with custom configuration
 * @param options - Optional configuration overrides
 * @returns A new Logger instance
 */
function createLogger(options) {
    return new Logger(options);
}
/**
 * Factory function to create a child logger with a specific context
 * @param context - The context for the logger
 * @returns A new Logger instance with the given context
 */
function createContextLogger(context) {
    return new Logger(undefined, context);
}
//# sourceMappingURL=logger.js.map