"use strict";
/**
 * Public Routes
 *
 * Public API endpoints that don't require authentication.
 * Used for driver route map access via token-based authorization.
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
const routeTokenService = __importStar(require("../services/route-token.service"));
const publicRouteService = __importStar(require("../services/public-route.service"));
const route_token_service_1 = require("../services/route-token.service");
const index_1 = require("../config/index");
const router = (0, express_1.Router)();
/**
 * GET /api/v1/public/route/:token
 *
 * Get public route map data by token.
 * Returns only coordinates and polyline - no sensitive customer data.
 *
 * @param token - Route access token (UUID)
 * @returns PublicRouteMapData if token is valid
 *
 * Responses:
 * - 200: Route data returned
 * - 404: Token not found or invalid
 * - 410: Token expired
 */
router.get('/route/:token', async (req, res, next) => {
    try {
        const { token } = req.params;
        if (!token) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'BAD_REQUEST',
                    message: 'Token is required',
                },
            });
            return;
        }
        // Validate the token
        const tokenResult = await routeTokenService.validateToken(token);
        if (!tokenResult.success) {
            const error = tokenResult.error;
            // Return 410 Gone for expired tokens
            if (error && error.code === route_token_service_1.RouteTokenErrorCodes.EXPIRED) {
                res.status(410).json({
                    success: false,
                    error: {
                        code: 'GONE',
                        message: 'This route link has expired',
                    },
                });
                return;
            }
            // Return 404 for not found / invalid tokens
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Invalid route link',
                },
            });
            return;
        }
        // Get public route map data
        const routeResult = await publicRouteService.getRouteMapData(tokenResult.data.routeId);
        if (!routeResult.success) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Route not found',
                },
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: routeResult.data,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/public/maps-key
 *
 * Get Google Maps API key for public map views.
 * This is a public endpoint - the key should be restricted in Google Cloud Console.
 */
router.get('/maps-key', (_req, res) => {
    const apiKey = index_1.config.googleMaps.apiKey || '';
    if (!apiKey) {
        res.status(503).json({
            success: false,
            error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'Maps service not configured',
            },
        });
        return;
    }
    res.status(200).json({
        success: true,
        data: {
            key: apiKey,
        },
    });
});
exports.default = router;
//# sourceMappingURL=public.routes.js.map