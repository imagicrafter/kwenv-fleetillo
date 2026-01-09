const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

const session = require('express-session');
const cookieParser = require('cookie-parser');

// Load env vars (only if .env file exists - in production, env vars come from platform)
const fs = require('fs');
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}
// Also load agent env vars for the chat proxy (if exists)
const agentEnvPath = path.join(__dirname, '../gradient-agents/optiroute-support-agent/.env');
if (fs.existsSync(agentEnvPath)) {
    dotenv.config({ path: agentEnvPath });
}

const app = express();
const PORT = process.env.WEB_PORT || 8080;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'demo123';

// Debug: Log password info at startup (masked)
console.log(`[DEBUG] DEMO_PASSWORD loaded: ${DEMO_PASSWORD ? DEMO_PASSWORD.substring(0, 3) + '***' : 'NOT SET'}`);
console.log(`[DEBUG] NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);

// Trust proxy - required for secure cookies behind load balancer
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

app.use(cors());
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'optiroute-demo-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
app.use(express.json());
// Auth Middleware
const requireAuth = (req, res, next) => {
    // Allow login page and static assets that might be needed for login (like css)
    if (req.path === '/login.html' || req.path === '/api/login' || req.path.endsWith('.css') || req.path.endsWith('.js') || req.path.endsWith('.jpg') || req.path.endsWith('.png')) {
        return next();
    }

    if (req.session && req.session.authenticated) {
        return next();
    }

    // If API call, return 401
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Otherwise redirect to login
    res.redirect('/login.html');
};

app.use(requireAuth);
app.use(express.static(path.join(__dirname, 'public')));

// Login Routes
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    console.log(`[DEBUG] Login attempt - received: "${password}", expected: "${DEMO_PASSWORD}", match: ${password === DEMO_PASSWORD}`);
    if (password === DEMO_PASSWORD) {
        req.session.authenticated = true;
        console.log('[DEBUG] Login successful, session authenticated');
        return res.json({ success: true });
    }
    console.log('[DEBUG] Login failed - password mismatch');
    return res.status(401).json({ success: false, message: 'Invalid access code' });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Import Services
// We assume web-launcher is at routeIQ-typescript/web-launcher and dist is at routeIQ-typescript/dist
const SERVICE_PATH = path.resolve(__dirname, '../dist/services');

const clientService = require(`${SERVICE_PATH}/client.service.js`);
const serviceService = require(`${SERVICE_PATH}/service.service.js`);
const bookingService = require(`${SERVICE_PATH}/booking.service.js`);
const locationService = require(`${SERVICE_PATH}/location.service.js`);
const vehicleService = require(`${SERVICE_PATH}/vehicle.service.js`);
const routeService = require(`${SERVICE_PATH}/route.service.js`);
const routePlanningService = require(`${SERVICE_PATH}/route-planning.service.js`);
const vehicleLocationService = require(`${SERVICE_PATH}/vehicle-location.service.js`);
const googleMapsService = require(`${SERVICE_PATH}/googlemaps.service.js`);
const activityService = require(`${SERVICE_PATH}/activity.service.js`);
const supabaseService = require(`${SERVICE_PATH}/supabase.js`);

// Initialize Supabase
supabaseService.initializeSupabase({
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    schema: process.env.SUPABASE_SCHEMA || 'optiroute'
});

// RPC Dispatcher
// Map namespace + method to actual service function
const rpcMap = {
    clients: {
        getAll: clientService.getClients,
        create: clientService.createClient,
        update: clientService.updateClient,
        delete: clientService.deleteClient,
        getById: clientService.getClient,
        count: clientService.countClients
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
        getById: bookingService.getBookingById,
        count: bookingService.countBookings
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
        getById: vehicleService.getVehicleById,
        count: vehicleService.countVehicles
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
        previewPlan: routePlanningService.previewRoutePlan,
        count: routeService.countRoutes
    },
    geocoding: {
        autocomplete: googleMapsService.getPlaceAutocomplete,
        geocodeAddress: (address) => googleMapsService.geocodeAddress({ address })
    },
    config: {
        getGoogleMapsApiKey: async () => process.env.GOOGLE_MAPS_API_KEY
    },
    activities: {
        getRecent: activityService.getRecentActivities,
        getAll: activityService.getActivities,
        getByEntity: activityService.getActivitiesByEntity
    }
};

// Chat Proxy Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, endpoint } = req.body;
        const apiKey = process.env.DIGITALOCEAN_API_TOKEN;

        if (!endpoint) {
            return res.status(400).json({ error: 'Endpoint is required' });
        }

        if (!apiKey) {
            console.error('Missing DIGITALOCEAN_API_TOKEN');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                input: {
                    messages: messages
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Gradient API Error (${response.status}):`, errorText);
            return res.status(response.status).json({ error: `Upstream error: ${response.status}` });
        }

        // Stream the response back to the client
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');

        if (response.body) {
            for await (const chunk of response.body) {
                res.write(chunk);
            }
        }
        res.end();

    } catch (err) {
        console.error('Chat Proxy Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/rpc', async (req, res) => {
    try {
        const { namespace, method, args } = req.body;

        console.log(`RPC Call: ${namespace}.${method}`, args);

        if (!rpcMap[namespace] || !rpcMap[namespace][method]) {
            console.error(`Method not found: ${namespace}.${method}`);
            if (rpcMap[namespace]) {
                console.error(`Available methods for ${namespace}:`, Object.keys(rpcMap[namespace]));
            } else {
                console.error(`Namespace ${namespace} not found. Available:`, Object.keys(rpcMap));
            }
            return res.status(404).json({ error: 'Method not found', available: rpcMap[namespace] ? Object.keys(rpcMap[namespace]) : [] });
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
    res.sendFile(path.join(__dirname, '../shared/public', 'index.html'));
});

app.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Server running at ${url}`);

    // Auto-open browser
    const start = (process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open');
    require('child_process').exec(start + ' ' + url);
});
