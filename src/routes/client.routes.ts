import { Router } from 'express';
import * as clientController from '../controllers/client.controller.js';
import { validateIdParam, validateRequired } from '../middleware/validation.js';

const router = Router();

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
router.get('/:id', validateIdParam('id'), clientController.getById);

/**
 * POST /api/v1/clients
 * Create a new client
 */
router.post(
  '/',
  validateRequired(['name', 'email']),
  clientController.create
);

/**
 * PUT /api/v1/clients/:id
 * Update client
 */
router.put(
  '/:id',
  validateIdParam('id'),
  clientController.update
);

/**
 * DELETE /api/v1/clients/:id
 * Soft delete client
 */
router.delete('/:id', validateIdParam('id'), clientController.remove);

/**
 * POST /api/v1/clients/:id/restore
 * Restore deleted client
 */
router.post('/:id/restore', validateIdParam('id'), clientController.restore);

export default router;
