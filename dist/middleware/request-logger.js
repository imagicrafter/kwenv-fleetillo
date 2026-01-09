"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logRequest = exports.requestLogger = void 0;
const morgan_1 = __importDefault(require("morgan"));
const logger_js_1 = require("../utils/logger.js");
/**
 * Custom morgan token to log request body (for development)
 */
morgan_1.default.token('body', (req) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        // Don't log sensitive fields
        const body = { ...req.body };
        if (body.password)
            body.password = '[REDACTED]';
        if (body.apiKey)
            body.apiKey = '[REDACTED]';
        if (body.token)
            body.token = '[REDACTED]';
        return JSON.stringify(body);
    }
    return '';
});
/**
 * Morgan format for development
 */
const devFormat = ':method :url :status :response-time ms - :body';
/**
 * Morgan format for production
 */
const prodFormat = ':method :url :status :response-time ms';
/**
 * Get morgan middleware based on environment
 */
const requestLogger = () => {
    const format = process.env.NODE_ENV === 'production' ? prodFormat : devFormat;
    return (0, morgan_1.default)(format, {
        stream: {
            write: (message) => {
                logger_js_1.logger.info(message.trim());
            },
        },
    });
};
exports.requestLogger = requestLogger;
/**
 * Custom request logging middleware for additional context
 */
const logRequest = (req, res, next) => {
    const startTime = Date.now();
    // Log when response is finished
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logData = {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('user-agent'),
            ip: req.ip,
        };
        if (res.statusCode >= 400) {
            logger_js_1.logger.warn('Request completed with error', logData);
        }
        else {
            logger_js_1.logger.debug('Request completed', logData);
        }
    });
    next();
};
exports.logRequest = logRequest;
//# sourceMappingURL=request-logger.js.map