"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customerService = __importStar(require("../services/customer.service"));
const bookingService = __importStar(require("../services/booking.service"));
const serviceService = __importStar(require("../services/service.service"));
const vehicleService = __importStar(require("../services/vehicle.service"));
const routeService = __importStar(require("../services/route.service"));
const driverService = __importStar(require("../services/driver.service"));
const locationService = __importStar(require("../services/location.service"));
const settingsService = __importStar(require("../services/settings.service"));
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// RPC Method Registry
// Maps namespace.method to actual service function
const rpcRegistry = {
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
    logger_1.logger.debug(`RPC Call: ${namespace}.${method}`, { args });
    const handler = rpcRegistry[namespace]?.[method];
    if (!handler) {
        logger_1.logger.warn(`RPC Method not found: ${namespace}.${method}`);
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
            }
            else {
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
    }
    catch (error) {
        logger_1.logger.error(`RPC Execution failed: ${namespace}.${method}`, error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: error.message || 'Internal server error'
            }
        });
    }
});
exports.default = router;
//# sourceMappingURL=rpc.routes.js.map