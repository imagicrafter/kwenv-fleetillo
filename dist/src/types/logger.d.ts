/**
 * Logger type definitions for RouteIQ application
 */
/**
 * Log levels in order of severity (lowest to highest)
 */
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}
/**
 * String representation of log levels
 */
export type LogLevelString = 'debug' | 'info' | 'warn' | 'error';
/**
 * Metadata that can be attached to log entries
 */
export interface LogMetadata {
    [key: string]: unknown;
}
/**
 * Structure of a log entry
 */
export interface LogEntry {
    timestamp: string;
    level: LogLevelString;
    message: string;
    context?: string;
    metadata?: LogMetadata;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}
/**
 * Logger configuration options
 */
export interface LoggerConfig {
    level: LogLevelString;
    format: 'json' | 'pretty';
    includeTimestamp: boolean;
    includeContext: boolean;
    colorize: boolean;
}
/**
 * Logger interface defining the public API
 */
export interface ILogger {
    debug(message: string, metadata?: LogMetadata): void;
    info(message: string, metadata?: LogMetadata): void;
    warn(message: string, metadata?: LogMetadata): void;
    error(message: string, error?: unknown, metadata?: LogMetadata): void;
    child(context: string): ILogger;
    setLevel(level: LogLevelString): void;
    getLevel(): LogLevelString;
}
//# sourceMappingURL=logger.d.ts.map