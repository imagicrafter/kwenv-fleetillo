import { Router } from 'express';
import * as driverController from '../controllers/driver.controller';
import { validateIdParam, validateRequired } from '../middleware/validation';

const router = Router();

/**
 * GET /api/v1/drivers/count
 * Get total count of drivers
 */
router.get('/count', driverController.count);

/**
 * GET /api/v1/drivers
 * Get all drivers with pagination and filters
 */
router.get('/', driverController.getAll);

/**
 * GET /api/v1/drivers/:id
 * Get driver by ID
 */
router.get('/:id', validateIdParam('id'), driverController.getById);

/**
 * POST /api/v1/drivers
 * Create a new driver
 */
router.post(
    '/',
    validateRequired(['firstName', 'lastName']),
    driverController.create
);

/**
 * PUT /api/v1/drivers/:id
 * Update driver
 */
router.put(
    '/:id',
    validateIdParam('id'),
    driverController.update
);

/**
 * DELETE /api/v1/drivers/:id
 * Soft delete driver
 */
router.delete('/:id', validateIdParam('id'), driverController.remove);

export default router;
