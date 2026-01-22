import { Router } from 'express';
import * as customerController from '../controllers/customer.controller';
import { validateIdParam, validateRequired } from '../middleware/validation';

const router = Router();

/**
 * GET /api/v1/customers/count
 * Get total count of customers
 */
router.get('/count', customerController.count);

/**
 * GET /api/v1/customers
 * Get all customers with pagination and filters
 */
router.get('/', customerController.getAll);

/**
 * GET /api/v1/customers/:id
 * Get customer by ID
 */
router.get('/:id', validateIdParam('id'), customerController.getById);

/**
 * POST /api/v1/customers
 * Create a new customer
 */
router.post(
  '/',
  validateRequired(['name', 'email']),
  customerController.create
);

/**
 * PUT /api/v1/customers/:id
 * Update customer
 */
router.put(
  '/:id',
  validateIdParam('id'),
  customerController.update
);

/**
 * DELETE /api/v1/customers/:id
 * Soft delete customer
 */
router.delete('/:id', validateIdParam('id'), customerController.remove);

/**
 * POST /api/v1/customers/:id/restore
 * Restore deleted customer
 */
router.post('/:id/restore', validateIdParam('id'), customerController.restore);

export default router;
