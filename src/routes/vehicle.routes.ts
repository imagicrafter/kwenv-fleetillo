import { Router } from 'express';
import * as vehicleController from '../controllers/vehicle.controller.js';
import { validateIdParam, validateRequired } from '../middleware/validation.js';

const router = Router();

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
router.get('/:id', validateIdParam('id'), vehicleController.getById);

/**
 * POST /api/v1/vehicles
 * Create a new vehicle
 */
router.post(
  '/',
  validateRequired(['name']),
  vehicleController.create
);

/**
 * PUT /api/v1/vehicles/:id
 * Update vehicle
 */
router.put(
  '/:id',
  validateIdParam('id'),
  vehicleController.update
);

/**
 * DELETE /api/v1/vehicles/:id
 * Soft delete vehicle
 */
router.delete('/:id', validateIdParam('id'), vehicleController.remove);

/**
 * POST /api/v1/vehicles/:id/restore
 * Restore deleted vehicle
 */
router.post('/:id/restore', validateIdParam('id'), vehicleController.restore);

/**
 * PATCH /api/v1/vehicles/:id/location
 * Update vehicle location (GPS coordinates)
 */
router.patch(
  '/:id/location',
  validateIdParam('id'),
  validateRequired(['latitude', 'longitude']),
  vehicleController.patchLocation
);

/**
 * PATCH /api/v1/vehicles/:id/status
 * Update vehicle status (availability)
 */
router.patch(
  '/:id/status',
  validateIdParam('id'),
  validateRequired(['status']),
  vehicleController.patchStatus
);

/**
 * PATCH /api/v1/vehicles/:id/service-types
 * Update vehicle service types (tagging)
 */
router.patch(
  '/:id/service-types',
  validateIdParam('id'),
  validateRequired(['serviceTypes']),
  vehicleController.patchServiceTypes
);

export default router;
