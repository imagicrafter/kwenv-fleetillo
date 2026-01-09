"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_js_1 = require("../config/index.js");
const router = (0, express_1.Router)();
/**
 * Health check endpoint
 * GET /health
 */
router.get('/', (_req, res) => {
    res.status(200).json({
        success: true,
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: index_js_1.config.env,
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
        },
    });
});
/**
 * Readiness check endpoint
 * GET /health/ready
 */
router.get('/ready', (_req, res) => {
    res.status(200).json({
        success: true,
        data: {
            ready: true,
            timestamp: new Date().toISOString(),
        },
    });
});
/**
 * Liveness check endpoint
 * GET /health/live
 */
router.get('/live', (_req, res) => {
    res.status(200).json({
        success: true,
        data: {
            alive: true,
            timestamp: new Date().toISOString(),
        },
    });
});
exports.default = router;
//# sourceMappingURL=health.routes.js.map