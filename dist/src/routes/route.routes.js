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
const routeController = __importStar(require("../controllers/route.controller.js"));
const validation_js_1 = require("../middleware/validation.js");
const router = (0, express_1.Router)();
/**
 * GET /api/v1/routes/count
 * Get total count of routes
 */
router.get('/count', routeController.count);
/**
 * GET /api/v1/routes/date-range
 * Get routes by date range
 * Query params: startDate, endDate (required), status, vehicleId, includeDeleted
 */
router.get('/date-range', routeController.getByDateRange);
/**
 * GET /api/v1/routes/vehicle/:vehicleId
 * Get routes by vehicle ID
 */
router.get('/vehicle/:vehicleId', (0, validation_js_1.validateIdParam)('vehicleId'), routeController.getByVehicle);
/**
 * POST /api/v1/routes/generate
 * Generate optimized routes from bookings
 */
router.post('/generate', (0, validation_js_1.validateRequired)(['bookingIds']), routeController.generate);
/**
 * POST /api/v1/routes/plan
 * Plan routes for a specific date
 */
router.post('/plan', (0, validation_js_1.validateRequired)(['routeDate']), routeController.plan);
/**
 * GET /api/v1/routes
 * Get all routes with pagination and filters
 */
router.get('/', routeController.getAll);
/**
 * GET /api/v1/routes/:id
 * Get route by ID
 */
router.get('/:id', (0, validation_js_1.validateIdParam)('id'), routeController.getById);
/**
 * POST /api/v1/routes
 * Create a new route
 */
router.post('/', (0, validation_js_1.validateRequired)(['routeName', 'routeDate']), routeController.create);
/**
 * PUT /api/v1/routes/:id
 * Update route
 */
router.put('/:id', (0, validation_js_1.validateIdParam)('id'), routeController.update);
/**
 * DELETE /api/v1/routes/:id
 * Soft delete route
 */
router.delete('/:id', (0, validation_js_1.validateIdParam)('id'), routeController.remove);
/**
 * POST /api/v1/routes/:id/restore
 * Restore deleted route
 */
router.post('/:id/restore', (0, validation_js_1.validateIdParam)('id'), routeController.restore);
/**
 * PATCH /api/v1/routes/:id/status
 * Update route status
 */
router.patch('/:id/status', (0, validation_js_1.validateIdParam)('id'), (0, validation_js_1.validateRequired)(['status']), routeController.updateStatus);
exports.default = router;
//# sourceMappingURL=route.routes.js.map