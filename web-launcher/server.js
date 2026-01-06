const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Import Services
// We assume web-launcher is at routeIQ-typescript/web-launcher and dist is at routeIQ-typescript/dist
const SERVICE_PATH = '../dist/services';

const clientService = require(`${SERVICE_PATH}/client.service.js`);
const serviceService = require(`${SERVICE_PATH}/service.service.js`);
const bookingService = require(`${SERVICE_PATH}/booking.service.js`);
const locationService = require(`${SERVICE_PATH}/location.service.js`);
const vehicleService = require(`${SERVICE_PATH}/vehicle.service.js`);
const routeService = require(`${SERVICE_PATH}/route.service.js`);
const routePlanningService = require(`${SERVICE_PATH}/route-planning.service.js`);
const vehicleLocationService = require(`${SERVICE_PATH}/vehicle-location.service.js`);
const googleMapsService = require(`${SERVICE_PATH}/googlemaps.service.js`);
const supabaseService = require(`${SERVICE_PATH}/supabase.js`);

// Initialize Supabase
supabaseService.initializeSupabase({
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    schema: process.env.SUPABASE_SCHEMA || 'routeiq'
});

// RPC Dispatcher
// Map namespace + method to actual service function
const rpcMap = {
    clients: {
        getAll: clientService.getClients,
        create: clientService.createClient,
        update: clientService.updateClient,
        delete: clientService.deleteClient,
        getById: clientService.getClient
    },
    services: {
        getAll: serviceService.getServices,
        create: serviceService.createService,
        update: serviceService.updateService,
        delete: serviceService.deleteService,
        getById: serviceService.getService
    },
    bookings: {
        getAll: bookingService.getBookings,
        create: bookingService.createBooking,
        update: bookingService.updateBooking,
        delete: bookingService.deleteBooking,
        getById: bookingService.getBookingById
    },
    locations: {
        getAll: locationService.getAllLocations,
        create: locationService.createLocation,
        update: locationService.updateLocation,
        delete: locationService.deleteLocation,
        getById: locationService.getLocationById
    },
    vehicles: {
        getAll: vehicleService.getVehicles,
        create: vehicleService.createVehicle,
        update: vehicleService.updateVehicle,
        delete: vehicleService.deleteVehicle,
        getById: vehicleService.getVehicleById
    },
    vehicleLocations: {
        getByVehicle: vehicleLocationService.getVehicleLocations,
        set: vehicleLocationService.setVehicleLocations,
        add: vehicleLocationService.addVehicleLocation,
        remove: vehicleLocationService.removeVehicleLocation,
        setPrimary: vehicleLocationService.setVehiclePrimaryLocation
    },
    routes: {
        getAll: routeService.getRoutes,
        create: routeService.createRoute,
        update: routeService.updateRoute,
        delete: routeService.deleteRoute,
        getById: routeService.getRouteById,
        getNextAvailableDate: routeService.getNextAvailableRouteDate,
        getStatsByDateRange: routeService.getRouteStatsByDateRange,
        plan: routePlanningService.planRoutes,
        previewPlan: routePlanningService.previewRoutePlan
    },
    geocoding: {
        autocomplete: googleMapsService.getPlaceAutocomplete,
        geocodeAddress: (address) => googleMapsService.geocodeAddress({ address })
    },
    config: {
        getGoogleMapsApiKey: async () => process.env.GOOGLE_MAPS_API_KEY
    }
};

app.post('/api/rpc', async (req, res) => {
    try {
        const { namespace, method, args } = req.body;

        console.log(`RPC Call: ${namespace}.${method}`, args);

        if (!rpcMap[namespace] || !rpcMap[namespace][method]) {
            return res.status(404).json({ error: 'Method not found' });
        }

        const fn = rpcMap[namespace][method];
        // Handle args: if it's an array, spread it. If not (unlikely from our verify), pass it.
        // Our client shim will send args as an array.
        const result = await fn(...(Array.isArray(args) ? args : [args]));

        // Most services return { success: boolean, data: any, error: any }
        // We act as a proxy, so we return the whole result, or maybe just data depending on frontend expectation.
        // The frontend expects the UNWRAPPED data in the shim (see main.js logic: returns result.data or throws).
        // Let's decide if we unwrap here or in the client.
        // main.js unwraps. Let's unwrap here to send clean JSON, 
        // OR better: return 200 with result, let client unwrap.
        // Actually main.js logic: if (!result.success) throw...
        // So allow us to return the raw result object, and the client shim will check .success.
        // Wait, main.js does: return result.data.
        // So we should return result.data if success, or 500 if error.

        // Wait, some service returns might be different.
        // Let's mirror main.js behavior.

        if (namespace === 'config') {
            return res.json(result); // straight value
        }

        if (result && typeof result === 'object' && 'success' in result) {
            if (result.success) {
                return res.json(result.data);
            } else {
                return res.status(400).json({ message: result.error?.message || 'Operation failed' });
            }
        }

        // If it's not a standard result object, just return it
        return res.json(result);

    } catch (err) {
        console.error('RPC Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
