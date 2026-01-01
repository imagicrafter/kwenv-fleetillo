import { Router } from 'express';
import * as serviceController from '../controllers/service.controller.js';
import { validateIdParam, validateRequired } from '../middleware/validation.js';

const router = Router();

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
router.get('/:id', validateIdParam('id'), serviceController.getById);

/**
 * POST /api/v1/services
 * Create a new service
 */
router.post(
  '/',
  validateRequired(['name', 'serviceType', 'averageDurationMinutes']),
  serviceController.create
);

/**
 * PUT /api/v1/services/:id
 * Update service
 */
router.put(
  '/:id',
  validateIdParam('id'),
  serviceController.update
);

/**
 * DELETE /api/v1/services/:id
 * Soft delete service
 */
router.delete('/:id', validateIdParam('id'), serviceController.remove);

/**
 * POST /api/v1/services/:id/restore
 * Restore deleted service
 */
router.post('/:id/restore', validateIdParam('id'), serviceController.restore);

export default router;
