import { Router } from 'express';
import * as dispatchJobController from '../controllers/dispatch-job.controller';
import { validateIdParam, validateRequired } from '../middleware/validation';

const router = Router();

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
router.get('/:id', validateIdParam('id'), dispatchJobController.getById);

/**
 * POST /api/v1/dispatch-jobs
 * Create a new dispatch job
 */
router.post(
    '/',
    validateRequired(['driverIds', 'scheduledTime']),
    dispatchJobController.create
);

/**
 * POST /api/v1/dispatch-jobs/:id/cancel
 * Cancel a dispatch job
 */
router.post('/:id/cancel', validateIdParam('id'), dispatchJobController.cancel);

export default router;
