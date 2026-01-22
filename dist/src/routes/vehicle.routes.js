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
const vehicleController = __importStar(require("../controllers/vehicle.controller"));
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
/**
 * GET /api/v1/vehicles/count
 * Get total count of vehicles
 */
router.get('/count', vehicleController.count);
/**
 * GET /api/v1/vehicles/service-type/:serviceType
 * Get vehicles by service type capability
 */
router.get('/service-type/:serviceType', vehicleController.getByServiceType);
/**
 * GET /api/v1/vehicles
 * Get all vehicles with pagination and filters
 */
router.get('/', vehicleController.getAll);
/**
 * GET /api/v1/vehicles/:id
 * Get vehicle by ID
 */
router.get('/:id', (0, validation_1.validateIdParam)('id'), vehicleController.getById);
/**
 * POST /api/v1/vehicles
 * Create a new vehicle
 */
router.post('/', (0, validation_1.validateRequired)(['name']), vehicleController.create);
/**
 * PUT /api/v1/vehicles/:id
 * Update vehicle
 */
router.put('/:id', (0, validation_1.validateIdParam)('id'), vehicleController.update);
/**
 * DELETE /api/v1/vehicles/:id
 * Soft delete vehicle
 */
router.delete('/:id', (0, validation_1.validateIdParam)('id'), vehicleController.remove);
/**
 * POST /api/v1/vehicles/:id/restore
 * Restore deleted vehicle
 */
router.post('/:id/restore', (0, validation_1.validateIdParam)('id'), vehicleController.restore);
/**
 * PATCH /api/v1/vehicles/:id/location
 * Update vehicle location (GPS coordinates)
 */
router.patch('/:id/location', (0, validation_1.validateIdParam)('id'), (0, validation_1.validateRequired)(['latitude', 'longitude']), vehicleController.patchLocation);
/**
 * PATCH /api/v1/vehicles/:id/status
 * Update vehicle status (availability)
 */
router.patch('/:id/status', (0, validation_1.validateIdParam)('id'), (0, validation_1.validateRequired)(['status']), vehicleController.patchStatus);
/**
 * PATCH /api/v1/vehicles/:id/service-types
 * Update vehicle service types (tagging)
 */
router.patch('/:id/service-types', (0, validation_1.validateIdParam)('id'), (0, validation_1.validateRequired)(['serviceTypes']), vehicleController.patchServiceTypes);
exports.default = router;
//# sourceMappingURL=vehicle.routes.js.map