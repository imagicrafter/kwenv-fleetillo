/**
 * Comprehensive logging framework for RouteIQ application
 *
 * Provides structured logging with different log levels (debug, info, warn, error),
 * context support, and environment-aware formatting.
 */
import type { LogLevel, LogLevelString, LogMetadata, LogEntry, LoggerConfig, ILogger } from '../types/logger';
/**
 * Logger class implementing the ILogger interface
 * Provides comprehensive logging with different levels and formatting options
 */
declare class Logger implements ILogger {
    private config;
    private context?;
    /**
     * Creates a new Logger instance
     * @param configOverrides - Optional configuration overrides
     * @param context - Optional context string for the logger
     */
    constructor(configOverrides?: Partial<LoggerConfig>, context?: string);
    /**
     * Checks if the given level should be logged based on current config
     */
    private shouldLog;
    /**
     * Formats a timestamp for log output
     */
    private formatTimestamp;
    /**
     * Formats the log level string with padding
     */
    private formatLevel;
    /**
     * Colorizes text if colorization is enabled
     */
    private colorize;
    /**
     * Serializes an error object for logging
     */
    private serializeError;
    /**
     * Creates a log entry object
     */
    private createLogEntry;
    /**
     * Formats a log entry for pretty console output
     */
    private formatPretty;
    /**
     * Formats a log entry as JSON for structured logging
     */
    private formatJson;
    /**
     * Outputs the log entry to the console
     */
    private output;
    /**
     * Logs a debug message
     * @param message - The message to log
     * @param metadata - Optional metadata to attach
     */
    debug(message: string, metadata?: LogMetadata): void;
    /**
     * Logs an info message
     * @param message - The message to log
     * @param metadata - Optional metadata to attach
     */
    info(message: string, metadata?: LogMetadata): void;
    /**
     * Logs a warning message
     * @param message - The message to log
     * @param metadata - Optional metadata to attach
     */
    warn(message: string, metadata?: LogMetadata): void;
    /**
     * Logs an error message
     * @param message - The message to log
     * @param error - Optional error object to include
     * @param metadata - Optional metadata to attach
     */
    error(message: string, error?: unknown, metadata?: LogMetadata): void;
    /**
     * Creates a child logger with a specific context
     * @param context - The context for the child logger
     * @returns A new Logger instance with the given context
     */
    child(context: string): ILogger;
    /**
     * Sets the log level
     * @param level - The new log level
     */
    setLevel(level: LogLevelString): void;
    /**
     * Gets the current log level
     * @returns The current log level
     */
    getLevel(): LogLevelString;
}
/**
 * Singleton logger instance for application-wide logging
 */
export declare const logger: Logger;
/**
 * Factory function to create a new logger with custom configuration
 * @param options - Optional configuration overrides
 * @returns A new Logger instance
 */
export declare function createLogger(options?: Partial<LoggerConfig>): ILogger;
/**
 * Factory function to create a child logger with a specific context
 * @param context - The context for the logger
 * @returns A new Logger instance with the given context
 */
export declare function createContextLogger(context: string): ILogger;
export { Logger };
export type { LogLevel, LogLevelString, LogMetadata, LogEntry, LoggerConfig, ILogger };
//# sourceMappingURL=logger.d.ts.map