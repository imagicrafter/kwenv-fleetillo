/**
 * Dispatch Service Integration for Web-Launcher
 *
 * This module allows the dispatch service to run embedded within
 * the web-launcher when DISPATCH_MODE=embedded.
 *
 * It dynamically imports the ESM dispatch service and mounts its routes.
 */

const express = require('express');

/**
 * Check if dispatch should be embedded
 */
function isEmbeddedMode() {
    // Default to embedded if not specified, or if explicitly set to 'embedded'
    return process.env.DISPATCH_MODE === 'embedded' || !process.env.DISPATCH_MODE;
}

/**
 * Create the dispatch router with all dispatch service routes
 * Uses dynamic import since dispatch-service is ESM
 */
async function createDispatchRouter() {
    const router = express.Router();

    // Import dispatch service modules (ESM)
    const dispatchServicePath = '../dispatch-service/dist';

    try {
        // Import the handlers and orchestrator
        const { createApiRouter } = await import(`${dispatchServicePath}/api/routes.js`);
        const { createDispatchOrchestrator } = await import(`${dispatchServicePath}/core/orchestrator.js`);
        const { telegramAdapter } = await import(`${dispatchServicePath}/adapters/telegram.js`);
        const { emailAdapter } = await import(`${dispatchServicePath}/adapters/email.js`);

        // Create the orchestrator with adapters
        const orchestrator = createDispatchOrchestrator([telegramAdapter, emailAdapter]);

        // Create the API router with dependencies
        const apiRouter = createApiRouter({
            orchestrator,
            healthDependencies: {
                adapters: [telegramAdapter, emailAdapter],
            },
        });

        // Mount the dispatch API routes
        router.use('/api/v1', apiRouter);

        // Root endpoint for dispatch service
        router.get('/', (req, res) => {
            res.json({
                service: 'OptiRoute Dispatch Service (Embedded)',
                version: '1.0.0',
                status: 'running',
                mode: 'embedded'
            });
        });

        console.log('[Dispatch] Embedded dispatch service routes mounted at /dispatch');

    } catch (error) {
        console.error('[Dispatch] Failed to load dispatch service:', error.message);

        // Debug: Write error to file for AI agent inspection
        try {
            const fs = require('fs');
            const debugLogPath = '/Users/justinmartin/.gemini/antigravity/brain/20522686-dbf4-4e78-b08a-988ddaca0f63/dispatch_init_error.log';
            const errorInfo = {
                timestamp: new Date().toISOString(),
                message: error.message,
                stack: error.stack,
                code: error.code,
                path: dispatchServicePath
            };
            fs.writeFileSync(debugLogPath, JSON.stringify(errorInfo, null, 2));
            console.log('[Debug] Error logged to ' + debugLogPath);
        } catch (filesErr) {
            console.error('[Debug] Failed to write error log:', filesErr);
        }

        // Return error handler if dispatch service fails to load
        router.use((req, res) => {
            res.status(503).json({
                error: {
                    code: 'DISPATCH_UNAVAILABLE',
                    message: 'Dispatch service is not available',
                    details: process.env.NODE_ENV !== 'production' ? error.message : undefined
                }
            });
        });
    }

    return router;
}

/**
 * Initialize dispatch integration
 * Call this after app setup but before app.listen()
 *
 * @param {express.Application} app - Express app instance
 * @returns {Promise<boolean>} - True if dispatch was mounted
 */
async function initializeDispatch(app) {
    if (!isEmbeddedMode()) {
        console.log('[Dispatch] Running in standalone mode - dispatch routes not mounted');
        return false;
    }

    console.log('[Dispatch] Initializing embedded dispatch service...');

    try {
        const dispatchRouter = await createDispatchRouter();

        // Mount dispatch routes at /dispatch
        // This makes the API available at /dispatch/api/v1/...
        app.use('/dispatch', dispatchRouter);

        console.log('[Dispatch] Embedded dispatch service initialized');
        console.log('[Dispatch] Dispatch API available at /dispatch/api/v1/...');
        console.log('[Dispatch]   - Health: GET /dispatch/api/v1/health');
        console.log('[Dispatch]   - Dispatch: POST /dispatch/api/v1/dispatch');
        console.log('[Dispatch]   - Telegram webhook: POST /dispatch/api/v1/telegram/webhook');

        return true;

    } catch (error) {
        console.error('[Dispatch] Failed to initialize embedded dispatch:', error);
        return false;
    }
}

module.exports = {
    isEmbeddedMode,
    createDispatchRouter,
    initializeDispatch
};
