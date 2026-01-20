"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
require("express-async-errors");
const index_js_1 = require("./config/index.js");
const error_handler_js_1 = require("./middleware/error-handler.js");
const request_logger_js_1 = require("./middleware/request-logger.js");
const validation_js_1 = require("./middleware/validation.js");
const index_js_2 = __importDefault(require("./routes/index.js"));
const health_routes_js_1 = __importDefault(require("./routes/health.routes.js"));
const logger_js_1 = require("./utils/logger.js");
/**
 * Create and configure Express application
 */
const createApp = () => {
    const app = (0, express_1.default)();
    // Security middleware
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
            },
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        },
    }));
    // CORS configuration
    app.use((0, cors_1.default)({
        origin: index_js_1.config.env === 'production'
            ? [] // Configure allowed origins in production
            : '*',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));
    // Body parsing middleware
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    // Request logging
    app.use((0, request_logger_js_1.requestLogger)());
    app.use(request_logger_js_1.logRequest);
    // Body sanitization
    app.use(validation_js_1.sanitizeBody);
    // Root endpoint
    app.get('/', (_req, res) => {
        res.json({
            success: true,
            data: {
                name: 'RouteIQ API',
                version: '1.0.0',
                status: 'running',
                environment: index_js_1.config.env,
                apiPrefix: `${index_js_1.config.api.prefix}/${index_js_1.config.api.version}`,
            },
        });
    });
    // Health check route (no prefix)
    app.use('/health', health_routes_js_1.default);
    // Static files serving - serves from dist/public when built, or src/public in dev
    const publicPath = path_1.default.join(process.cwd(), 'dist', 'public');
    app.use('/ui', express_1.default.static(publicPath));
    // API routes with prefix
    app.use(`${index_js_1.config.api.prefix}/${index_js_1.config.api.version}`, index_js_2.default);
    // 404 handler
    app.use(error_handler_js_1.notFoundHandler);
    // Global error handler (must be last)
    app.use(error_handler_js_1.errorHandler);
    logger_js_1.logger.info('Express application configured successfully', {
        nodeEnv: index_js_1.config.env,
        apiPrefix: index_js_1.config.api.prefix,
        apiVersion: index_js_1.config.api.version,
    });
    return app;
};
exports.createApp = createApp;
exports.default = exports.createApp;
//# sourceMappingURL=app.js.map