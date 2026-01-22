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
const serviceController = __importStar(require("../controllers/service.controller"));
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
/**
 * GET /api/v1/services/count
 * Get total count of services
 */
router.get('/count', serviceController.count);
/**
 * GET /api/v1/services/code/:code
 * Get service by code
 */
router.get('/code/:code', serviceController.getByCode);
/**
 * GET /api/v1/services
 * Get all services with pagination and filters
 */
router.get('/', serviceController.getAll);
/**
 * GET /api/v1/services/:id
 * Get service by ID
 */
router.get('/:id', (0, validation_1.validateIdParam)('id'), serviceController.getById);
/**
 * POST /api/v1/services
 * Create a new service
 */
router.post('/', (0, validation_1.validateRequired)(['name', 'serviceType', 'averageDurationMinutes']), serviceController.create);
/**
 * PUT /api/v1/services/:id
 * Update service
 */
router.put('/:id', (0, validation_1.validateIdParam)('id'), serviceController.update);
/**
 * DELETE /api/v1/services/:id
 * Soft delete service
 */
router.delete('/:id', (0, validation_1.validateIdParam)('id'), serviceController.remove);
/**
 * POST /api/v1/services/:id/restore
 * Restore deleted service
 */
router.post('/:id/restore', (0, validation_1.validateIdParam)('id'), serviceController.restore);
exports.default = router;
//# sourceMappingURL=service.routes.js.map