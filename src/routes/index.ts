import { Router } from 'express';
import customerRoutes from './customer.routes';
import bookingRoutes from './booking.routes';
import serviceRoutes from './service.routes';
import vehicleRoutes from './vehicle.routes';
import routeRoutes from './route.routes';
import dispatchJobRoutes from './dispatch-job.routes';
import driverRoutes from './driver.routes';

const router = Router();

/**
 * API Routes
 * Base path: /api/v1
 */

// Customer routes
router.use('/customers', customerRoutes);

// Booking routes
router.use('/bookings', bookingRoutes);

// Service routes
router.use('/services', serviceRoutes);

// Vehicle routes
router.use('/vehicles', vehicleRoutes);

// Route routes
router.use('/routes', routeRoutes);

// Dispatch job routes
router.use('/dispatch-jobs', dispatchJobRoutes);

// Driver routes
router.use('/drivers', driverRoutes);

// Root API endpoint
router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Fleetillo API',
      version: '1.0.0',
      description: 'Route planning and management API',
      endpoints: {
        health: '/health',
        customers: '/api/v1/customers',
        bookings: '/api/v1/bookings',
        services: '/api/v1/services',
        vehicles: '/api/v1/vehicles',
        routes: '/api/v1/routes',
      },
    },
  });
});

export default router;
