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
const dispatchJobController = __importStar(require("../controllers/dispatch-job.controller.js"));
const validation_js_1 = require("../middleware/validation.js");
const router = (0, express_1.Router)();
/**
 * GET /api/v1/dispatch-jobs/active-drivers
 * Get drivers currently in active dispatch jobs
 */
router.get('/active-drivers', dispatchJobController.getActiveDrivers);
/**
 * GET /api/v1/dispatch-jobs
 * Get all dispatch jobs with optional filters
 */
router.get('/', dispatchJobController.getAll);
/**
 * GET /api/v1/dispatch-jobs/:id
 * Get dispatch job by ID
 */
router.get('/:id', (0, validation_js_1.validateIdParam)('id'), dispatchJobController.getById);
/**
 * POST /api/v1/dispatch-jobs
 * Create a new dispatch job
 */
router.post('/', (0, validation_js_1.validateRequired)(['driverIds', 'scheduledTime']), dispatchJobController.create);
/**
 * POST /api/v1/dispatch-jobs/:id/cancel
 * Cancel a dispatch job
 */
router.post('/:id/cancel', (0, validation_js_1.validateIdParam)('id'), dispatchJobController.cancel);
exports.default = router;
//# sourceMappingURL=dispatch-job.routes.js.map