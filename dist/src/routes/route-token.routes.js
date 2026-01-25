"use strict";
/**
 * Route Token Routes
 *
 * Protected API endpoints for managing route access tokens.
 * Used by the dispatch service to generate tokenized route links.
 */
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const api_key_auth_1 = require("../middleware/api-key-auth");
const validation_1 = require("../middleware/validation");
const routeTokenService = __importStar(require("../services/route-token.service"));
const index_1 = require("../config/index");
const router = (0, express_1.Router)();
/**
 * POST /api/v1/route-tokens
 *
 * Create a new route access token.
 * Protected by API key authentication.
 *
 * Request body:
 * - route_id: string (required) - The route to create a token for
 * - expiration_hours: number (optional) - Hours until expiration (default: 24)
 *
 * Response:
 * - token: string - The generated token
 * - expires_at: string - ISO datetime when token expires
 * - url: string - Full URL for driver route view
 */
router.post('/', api_key_auth_1.apiKeyAuth, (0, validation_1.validateRequired)(['route_id']), async (req, res, next) => {
    try {
        const { route_id, expiration_hours } = req.body;
        const result = await routeTokenService.createToken({
            routeId: route_id,
            expirationHours: expiration_hours,
        }, index_1.config.baseUrl);
        if (!result.success) {
            const error = result.error;
            const statusCode = error?.code === 'ROUTE_NOT_FOUND' ? 404 : 400;
            res.status(statusCode).json({
                success: false,
                error: {
                    code: error?.code || 'CREATE_FAILED',
                    message: error?.message || 'Failed to create route token',
                },
            });
            return;
        }
        res.status(201).json({
            success: true,
            data: {
                token: result.data.token,
                expires_at: result.data.expiresAt.toISOString(),
                url: result.data.url,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * DELETE /api/v1/route-tokens/expired
 *
 * Cleanup expired tokens (older than 7 days).
 * Protected by API key authentication.
 * Typically called by a scheduled job.
 */
router.delete('/expired', api_key_auth_1.apiKeyAuth, async (req, res, next) => {
    try {
        const daysOld = parseInt(req.query.days_old) || 7;
        const result = await routeTokenService.cleanupExpiredTokens(daysOld);
        if (!result.success) {
            const error = result.error;
            res.status(500).json({
                success: false,
                error: {
                    code: error?.code || 'CLEANUP_FAILED',
                    message: error?.message || 'Failed to cleanup expired tokens',
                },
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: {
                deleted_count: result.data.deletedCount,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=route-token.routes.js.map