import { Router } from 'express';
import clientRoutes from './client.routes.js';
import bookingRoutes from './booking.routes.js';
import serviceRoutes from './service.routes.js';
import vehicleRoutes from './vehicle.routes.js';
import routeRoutes from './route.routes.js';
import dispatchJobRoutes from './dispatch-job.routes.js';

const router = Router();

/**
 * API Routes
 * Base path: /api/v1
 */

// Client routes
router.use('/clients', clientRoutes);

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

// Root API endpoint
router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'RouteIQ API',
      version: '1.0.0',
      description: 'Route planning and management API',
      endpoints: {
        health: '/health',
        clients: '/api/v1/clients',
        bookings: '/api/v1/bookings',
        services: '/api/v1/services',
        vehicles: '/api/v1/vehicles',
        routes: '/api/v1/routes',
      },
    },
  });
});

export default router;
