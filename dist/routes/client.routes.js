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
const clientController = __importStar(require("../controllers/client.controller.js"));
const validation_js_1 = require("../middleware/validation.js");
const router = (0, express_1.Router)();
/**
 * GET /api/v1/clients/count
 * Get total count of clients
 */
router.get('/count', clientController.count);
/**
 * GET /api/v1/clients
 * Get all clients with pagination and filters
 */
router.get('/', clientController.getAll);
/**
 * GET /api/v1/clients/:id
 * Get client by ID
 */
router.get('/:id', (0, validation_js_1.validateIdParam)('id'), clientController.getById);
/**
 * POST /api/v1/clients
 * Create a new client
 */
router.post('/', (0, validation_js_1.validateRequired)(['name', 'email']), clientController.create);
/**
 * PUT /api/v1/clients/:id
 * Update client
 */
router.put('/:id', (0, validation_js_1.validateIdParam)('id'), clientController.update);
/**
 * DELETE /api/v1/clients/:id
 * Soft delete client
 */
router.delete('/:id', (0, validation_js_1.validateIdParam)('id'), clientController.remove);
/**
 * POST /api/v1/clients/:id/restore
 * Restore deleted client
 */
router.post('/:id/restore', (0, validation_js_1.validateIdParam)('id'), clientController.restore);
exports.default = router;
//# sourceMappingURL=client.routes.js.map