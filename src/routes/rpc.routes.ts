
import { Router } from 'express';
import * as customerService from '../services/customer.service';
import * as bookingService from '../services/booking.service';
import * as serviceService from '../services/service.service';
import * as vehicleService from '../services/vehicle.service';
import * as routeService from '../services/route.service';
import * as driverService from '../services/driver.service';
import * as locationService from '../services/location.service';
import * as settingsService from '../services/settings.service';
import { logger } from '../utils/logger';

const router = Router();

// RPC Method Registry
// Maps namespace.method to actual service function
const rpcRegistry: Record<string, Record<string, Function>> = {
    customers: {
        getAll: customerService.getCustomers,
        create: customerService.createCustomer,
        update: customerService.updateCustomer,
        delete: customerService.deleteCustomer,
        count: customerService.countCustomers,
        getById: customerService.getCustomerById,
    },
    // Add other namespaces as needed based on api-client.js
    bookings: {
        getAll: bookingService.getBookings,
        count: bookingService.countBookings,
        getById: bookingService.getBookingById,
    },
    services: {
        getAll: serviceService.getServices,
        count: serviceService.countServices,
    },
    vehicles: {
        getAll: vehicleService.getVehicles,
        count: vehicleService.countVehicles,
    },
    routes: {
        getAll: routeService.getRoutes,
        count: routeService.countRoutes,
    },
    drivers: {
        getAll: driverService.getDrivers,
        count: driverService.countDrivers,
        getById: async (id: string) => driverService.getDriverById(id),
        create: async (input: any) => driverService.createDriver(input),
        update: async (input: any) => driverService.updateDriver(input.id, input),
        delete: async (input: any) => driverService.deleteDriver(input.id),
        assignToVehicle: async (input: any) => driverService.assignDriverToVehicle(input.driverId, input.vehicleId),
        unassignFromVehicle: async (input: any) => driverService.unassignDriverFromVehicle(input.vehicleId),
    },
    settings: {
        getRouteSettings: async () => ({ dashboard: { showChatbot: true } }),
        getSetting: settingsService.getSetting,
        getAll: settingsService.getAllSettings
    },
    locations: {
        getAll: locationService.getAllLocations,
        getById: locationService.getLocationById,
        create: locationService.createLocation,
        update: locationService.updateLocation,
        delete: locationService.deleteLocation,
    },
    config: {
        getGoogleMapsApiKey: async () => ({ apiKey: process.env.GOOGLE_MAPS_API_KEY || '' }),
    }
};

router.post('/rpc', async (req, res) => {
    const { namespace, method, args } = req.body;

    if (!namespace || !method) {
        return res.status(400).json({
            success: false,
            error: { code: 'INVALID_REQUEST', message: 'Namespace and method are required' }
        });
    }

    logger.debug(`RPC Call: ${namespace}.${method}`, { args });

    const handler = rpcRegistry[namespace]?.[method];

    if (!handler) {
        logger.warn(`RPC Method not found: ${namespace}.${method}`);
        return res.status(404).json({
            success: false,
            error: { code: 'METHOD_NOT_FOUND', message: `Method ${namespace}.${method} not found` }
        });
    }

    try {
        // Call the service method
        // Most service methods take (input, options) or (filters, pagination)
        // The args array from frontend aligns with these
        const result = await handler(...(args || []));

        if (result && result.success !== undefined) {
            if (result.success) {
                return res.json(result.data);
            } else {
                return res.status(400).json({
                    success: false,
                    code: result.error?.code || 'RPC_ERROR',
                    message: result.error?.message || 'Operation failed',
                    details: result.error?.details
                });
            }
        }

        // Direct return value
        return res.json(result);

    } catch (error: any) {
        logger.error(`RPC Execution failed: ${namespace}.${method}`, error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Internal server error'
            }
        });
    }
});

export default router;
