import { Router } from 'express';
import * as routeController from '../controllers/route.controller.js';
import { validateIdParam, validateRequired } from '../middleware/validation.js';

const router = Router();

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
router.get('/vehicle/:vehicleId', validateIdParam('vehicleId'), routeController.getByVehicle);

/**
 * POST /api/v1/routes/generate
 * Generate optimized routes from bookings
 */
router.post(
  '/generate',
  validateRequired(['bookingIds']),
  routeController.generate
);

/**
 * POST /api/v1/routes/plan
 * Plan routes for a specific date
 */
router.post(
  '/plan',
  validateRequired(['routeDate']),
  routeController.plan
);

/**
 * GET /api/v1/routes
 * Get all routes with pagination and filters
 */
router.get('/', routeController.getAll);

/**
 * GET /api/v1/routes/:id
 * Get route by ID
 */
router.get('/:id', validateIdParam('id'), routeController.getById);

/**
 * POST /api/v1/routes
 * Create a new route
 */
router.post(
  '/',
  validateRequired(['routeName', 'routeDate']),
  routeController.create
);

/**
 * PUT /api/v1/routes/:id
 * Update route
 */
router.put(
  '/:id',
  validateIdParam('id'),
  routeController.update
);

/**
 * DELETE /api/v1/routes/:id
 * Soft delete route
 */
router.delete('/:id', validateIdParam('id'), routeController.remove);

/**
 * POST /api/v1/routes/:id/restore
 * Restore deleted route
 */
router.post('/:id/restore', validateIdParam('id'), routeController.restore);

/**
 * PATCH /api/v1/routes/:id/status
 * Update route status
 */
router.patch(
  '/:id/status',
  validateIdParam('id'),
  validateRequired(['status']),
  routeController.updateStatus
);

export default router;
