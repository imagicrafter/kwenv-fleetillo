import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller.js';
import { validateIdParam, validateRequired } from '../middleware/validation.js';
import { uploadCSV as uploadCSVMiddleware, handleUploadError, requireFile } from '../middleware/fileUpload.js';

const router = Router();

/**
 * GET /api/v1/bookings/template
 * Download CSV template for booking uploads
 */
router.get('/template', bookingController.downloadTemplate);

/**
 * GET /api/v1/bookings/count
 * Get total count of bookings
 */
router.get('/count', bookingController.count);

/**
 * GET /api/v1/bookings/number/:bookingNumber
 * Get booking by booking number
 */
router.get('/number/:bookingNumber', bookingController.getByNumber);

/**
 * GET /api/v1/bookings
 * Get all bookings with pagination and filters
 */
router.get('/', bookingController.getAll);

/**
 * GET /api/v1/bookings/:id
 * Get booking by ID
 */
router.get('/:id', validateIdParam('id'), bookingController.getById);

/**
 * POST /api/v1/bookings/upload
 * Upload CSV file with bookings
 */
router.post(
  '/upload',
  uploadCSVMiddleware,
  requireFile,
  handleUploadError,
  bookingController.uploadCSV
);

/**
 * POST /api/v1/bookings
 * Create a new booking
 */
router.post(
  '/',
  validateRequired(['customerId', 'serviceId', 'bookingType', 'scheduledDate', 'scheduledStartTime']),
  bookingController.create
);

/**
 * PUT /api/v1/bookings/:id
 * Update booking
 */
router.put(
  '/:id',
  validateIdParam('id'),
  bookingController.update
);

/**
 * DELETE /api/v1/bookings/:id
 * Soft delete booking
 */
router.delete('/:id', validateIdParam('id'), bookingController.remove);

/**
 * POST /api/v1/bookings/:id/restore
 * Restore deleted booking
 */
router.post('/:id/restore', validateIdParam('id'), bookingController.restore);

export default router;
