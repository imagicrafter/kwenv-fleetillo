"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customer_routes_js_1 = __importDefault(require("./customer.routes.js"));
const booking_routes_js_1 = __importDefault(require("./booking.routes.js"));
const service_routes_js_1 = __importDefault(require("./service.routes.js"));
const vehicle_routes_js_1 = __importDefault(require("./vehicle.routes.js"));
const route_routes_js_1 = __importDefault(require("./route.routes.js"));
const dispatch_job_routes_js_1 = __importDefault(require("./dispatch-job.routes.js"));
const driver_routes_js_1 = __importDefault(require("./driver.routes.js"));
const router = (0, express_1.Router)();
/**
 * API Routes
 * Base path: /api/v1
 */
// Customer routes
router.use('/customers', customer_routes_js_1.default);
// Booking routes
router.use('/bookings', booking_routes_js_1.default);
// Service routes
router.use('/services', service_routes_js_1.default);
// Vehicle routes
router.use('/vehicles', vehicle_routes_js_1.default);
// Route routes
router.use('/routes', route_routes_js_1.default);
// Dispatch job routes
router.use('/dispatch-jobs', dispatch_job_routes_js_1.default);
// Driver routes
router.use('/drivers', driver_routes_js_1.default);
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
exports.default = router;
//# sourceMappingURL=index.js.map