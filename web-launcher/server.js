const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const multer = require('multer');

const session = require('express-session');
const cookieParser = require('cookie-parser');

// Load env vars (only if .env file exists - in production, env vars come from platform)
const fs = require('fs');
const envPath = path.join(__dirname, '../.env');
const localEnvPath = path.join(__dirname, '.env');

// Try loading from current directory first (for web-launcher specific config)
if (fs.existsSync(localEnvPath)) {
    console.log('[Config] Loading .env from web-launcher directory');
    dotenv.config({ path: localEnvPath });
}

// Then try loading from parent directory (for shared config)
if (fs.existsSync(envPath)) {
    // We don't override existing vars, so specific config wins
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
console.log(`[DEBUG] EMAIL_PROVIDER: ${process.env.EMAIL_PROVIDER || 'not set'}`);
console.log(`[DEBUG] RESEND_API_KEY: ${process.env.RESEND_API_KEY ? (process.env.RESEND_API_KEY.substring(0, 5) + '...') : 'not set'}`);
console.log(`[DEBUG] SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? 'set' : 'not set'}`);

// Trust proxy - required for secure cookies behind load balancer
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

app.use(cors());

// Allow iframe embedding when ALLOW_IFRAME=true
if (process.env.ALLOW_IFRAME === 'true') {
    console.log('[Config] Iframe embedding ENABLED - removing all frame restrictions');
    app.use((req, res, next) => {
        // Intercept the response to remove any frame-related headers
        const originalSetHeader = res.setHeader.bind(res);
        res.setHeader = function (name, value) {
            // Block any X-Frame-Options or CSP headers from being set
            if (name.toLowerCase() === 'x-frame-options') return this;
            if (name.toLowerCase() === 'content-security-policy' &&
                typeof value === 'string' && value.includes('frame-ancestors')) {
                return this;
            }
            return originalSetHeader(name, value);
        };
        // Also explicitly remove them if they exist
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        next();
    });
} else {
    console.log('[Config] Iframe embedding DISABLED (default)');
}
app.use(cookieParser());

// Determine cookie settings based on iframe mode
const isIframeMode = process.env.ALLOW_IFRAME === 'true';
const isProduction = process.env.NODE_ENV === 'production';

app.use(session({
    secret: process.env.SESSION_SECRET || 'fleetillo-demo-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction, // Must be true for SameSite=none
        httpOnly: true,
        // SameSite=none allows cookies in cross-origin iframes, but requires secure=true
        sameSite: isIframeMode ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

if (isIframeMode) {
    console.log('[Config] Session cookies set for iframe mode (SameSite=none)');
}
app.use(express.json());
// Auth Middleware
const requireAuth = (req, res, next) => {
    // Allow login page and static assets that might be needed for login (like css)
    if (req.path === '/login.html' || req.path === '/api/login' || req.path.endsWith('.css') || req.path.endsWith('.js') || req.path.endsWith('.jpg') || req.path.endsWith('.png')) {
        return next();
    }

    // Allow Telegram Webhook and Health Check (public endpoints)
    // These endpoints are called by external services (Telegram) without authentication
    // Must check BEFORE the /dispatch block to avoid session auth requirement
    if (req.path.includes('/telegram/webhook') || req.path.includes('/api/v1/health') || req.path === '/dispatch/api/v1/health') {
        console.log(`[Auth] Allowing public access to: ${req.path}`);
        return next();
    }

    // Dispatch Service Auth & Proxy
    if (req.path.startsWith('/dispatch')) {
        // If authenticated via web session, allow internal access to dispatch service
        if (req.session && req.session.authenticated) {
            // Inject the API key trusted by the dispatch service
            // This allows the frontend to call /dispatch APIs without exposing the key
            const keys = (process.env.DISPATCH_API_KEYS || 'default-dev-key').split(',');
            // console.log(`[Auth] Injecting API key for ${req.path}: ${keys[0].substring(0, 3)}...`);
            req.headers['x-api-key'] = keys[0];
            return next();
        } else {
            console.log(`[Auth] Dispatch request unauthenticated: ${req.path}`);
        }
    }

    // If not authenticated, allow login pages (handled below) or reject
    // We do NOT return next() here if not authenticated, so it falls through to the checks below


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

// Configure multer for CSV file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    },
});

// Configure multer for image uploads (driver avatars)
const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
        }
    },
});

// Import Services
// We assume web-launcher is at routeIQ-typescript/web-launcher and dist is at routeIQ-typescript/dist
const SERVICE_PATH = path.resolve(__dirname, '../dist/services');

const customerService = require(`${SERVICE_PATH}/customer.service.js`);
const serviceService = require(`${SERVICE_PATH}/service.service.js`);
const bookingService = require(`${SERVICE_PATH}/booking.service.js`);
const locationService = require(`${SERVICE_PATH}/location.service.js`);
const vehicleService = require(`${SERVICE_PATH}/vehicle.service.js`);
const driverService = require(`${SERVICE_PATH}/driver.service.js`);
const routeService = require(`${SERVICE_PATH}/route.service.js`);
const routePlanningService = require(`${SERVICE_PATH}/route-planning.service.js`);
const vehicleLocationService = require(`${SERVICE_PATH}/vehicle-location.service.js`);
const googleMapsService = require(`${SERVICE_PATH}/googlemaps.service.js`);
const activityService = require(`${SERVICE_PATH}/activity.service.js`);
const settingsService = require(`${SERVICE_PATH}/settings.service.js`);
const supabaseService = require(`${SERVICE_PATH}/supabase.js`);
const csvService = require(`${SERVICE_PATH}/csv.service.js`);
const dispatchJobService = require(`${SERVICE_PATH}/dispatch-job.service.js`);

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
    customers: {
        getAll: customerService.getCustomers,
        create: customerService.createCustomer,
        update: customerService.updateCustomer,
        delete: customerService.deleteCustomer,
        getById: customerService.getCustomer,
        count: async (filters) => {
            try {
                // Direct query to bypass potential service layer issues
                const { getAdminSupabaseClient } = require(`${SERVICE_PATH}/supabase.js`);
                const admin = getAdminSupabaseClient();

                // Using head: false and limit(1) to reliably get count without header stripping issues on DO
                let query = admin.from('customers').select('id', { count: 'exact', head: false }).limit(1);

                if (filters && filters.status) {
                    query = query.eq('status', filters.status);
                }

                // Always exclude deleted unless specified (matching service logic)
                if (!filters || !filters.includeDeleted) {
                    query = query.is('deleted_at', null);
                }

                const { count, error } = await query;

                if (error) {
                    console.error('Direct count failed:', error);
                    // Fallback to service if direct fails
                    return customerService.countCustomers(filters);
                }

                return { success: true, data: count || 0 };
            } catch (err) {
                console.error('Direct count exception:', err);
                return customerService.countCustomers(filters);
            }
        }
    },
    services: {
        getAll: serviceService.getServices,
        create: serviceService.createService,
        update: serviceService.updateService,
        delete: serviceService.deleteService,
        getById: serviceService.getServiceById
    },
    bookings: {
        getAll: bookingService.getBookings,
        create: bookingService.createBooking,
        update: bookingService.updateBooking,
        delete: bookingService.deleteBooking,
        getById: bookingService.getBookingById,
        count: bookingService.countBookings,
        removeFromRoute: bookingService.removeBookingFromRoute
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
    drivers: {
        getAll: driverService.getDrivers,
        create: driverService.createDriver,
        // Wrap update to handle combined {id, ...input} object from frontend
        update: (data) => {
            const { id, ...input } = data;
            return driverService.updateDriver(id, input);
        },
        delete: (data) => {
            // Handle {id} object from frontend
            const id = typeof data === 'string' ? data : data.id;
            return driverService.deleteDriver(id);
        },
        getById: driverService.getDriverById,
        count: driverService.countDrivers,
        // Wrap to handle {driverId, vehicleId} object from frontend
        assignToVehicle: (data) => {
            console.log('[DEBUG] assignToVehicle wrapper received:', JSON.stringify(data));
            return driverService.assignDriverToVehicle(data.driverId, data.vehicleId);
        },
        unassignFromVehicle: (data) => {
            const driverId = typeof data === 'string' ? data : data.driverId;
            return driverService.unassignDriverFromVehicle(driverId);
        },
        getVehicles: driverService.getDriverVehicles
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
    },
    settings: {
        getSetting: settingsService.getSetting,
        getAll: settingsService.getAllSettings,
        getRouteSettings: settingsService.getRouteSettings,
        update: settingsService.updateSetting,
        updateMultiple: settingsService.updateSettings,
        getRoutePlanningParams: settingsService.getRoutePlanningParams
    },
    dispatchJobs: {
        getAll: dispatchJobService.dispatchJobService.getDispatchJobs,
        getById: dispatchJobService.dispatchJobService.getDispatchJobById,
        create: dispatchJobService.dispatchJobService.createDispatchJob,
        cancel: dispatchJobService.dispatchJobService.cancelDispatchJob,
        execute: dispatchJobService.dispatchJobService.executeDispatchJob,
        removeDriver: (data) => {
            return dispatchJobService.dispatchJobService.removeDriverFromJob(data.jobId, data.driverId);
        },
        getDriversInActiveJobs: dispatchJobService.dispatchJobService.getDriversInActiveJobs,
        checkDriverConflicts: dispatchJobService.dispatchJobService.checkDriverConflicts,
        getPendingDue: dispatchJobService.dispatchJobService.getPendingJobsDue
    }
};

// Helper function to convert snake_case to camelCase
function snakeToCamel(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }

    // If it's an array, recursively process each element
    if (Array.isArray(obj)) {
        return obj.map(item => snakeToCamel(item));
    }

    // If it's not an object (primitive), return as-is
    if (typeof obj !== 'object') {
        return obj;
    }

    // Convert object keys from snake_case to camelCase
    const converted = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            // Convert snake_case to camelCase
            const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
            // Recursively convert nested objects
            converted[camelKey] = snakeToCamel(obj[key]);
        }
    }
    return converted;
}

// Chat Proxy Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, endpoint } = req.body;
        const apiKey = process.env.DIGITALOCEAN_API_TOKEN;

        console.log('[DEBUG] Chat Request Received');
        console.log(`[DEBUG] Endpoint: ${endpoint}`);
        console.log(`[DEBUG] API Key present: ${!!apiKey}`);

        if (!endpoint) {
            console.error('[DEBUG] Missing endpoint');
            return res.status(400).json({ error: 'Endpoint is required' });
        }

        if (!apiKey) {
            console.error('[DEBUG] Missing DIGITALOCEAN_API_TOKEN');
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
            console.error(`[DEBUG] Gradient API Error (${response.status}):`, errorText);
            return res.status(response.status).json({ error: `Upstream error: ${response.status}` });
        }

        console.log('[DEBUG] Gradient API Success, starting stream');

        // Stream the response back to the client
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');

        if (response.body) {
            for await (const chunk of response.body) {
                res.write(chunk);
            }
        }
        res.end();

    } catch (err) {
        console.error('[DEBUG] Chat Proxy Exception:', err);
        res.status(500).json({ error: err.message });
    }
});

// CSV Upload Endpoint
app.post('/api/bookings/upload', upload.single('file'), async (req, res) => {
    try {
        console.log('CSV Upload Request Received');

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        // Parse and validate the CSV file
        const parseResult = await csvService.parseAndValidateCSV(req.file.buffer);

        if (!parseResult.success || !parseResult.data) {
            return res.status(400).json({
                success: false,
                error: parseResult.error?.message || 'Failed to parse CSV file'
            });
        }

        const { validBookings, errors, totalRows, validRows, invalidRows } = parseResult.data;

        // If there are no valid bookings, return error
        if (validBookings.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid bookings found in CSV file',
                details: {
                    totalRows,
                    validRows: 0,
                    invalidRows,
                    errors: errors.map(e => ({
                        row: e.row,
                        message: e.message
                    }))
                }
            });
        }

        // Attempt to bulk create bookings
        const createResult = await bookingService.bulkCreateBookings(validBookings);

        if (!createResult.success) {
            return res.status(500).json({
                success: false,
                error: createResult.error?.message || 'Failed to create bookings',
                details: {
                    totalRows,
                    validRows,
                    invalidRows,
                    parseErrors: errors
                }
            });
        }

        // Determine response status based on errors
        const hasParseErrors = errors.length > 0;
        const statusCode = hasParseErrors ? 207 : 201; // 207 = Multi-Status (partial success)

        return res.status(statusCode).json({
            success: true,
            data: {
                totalRows,
                validRows,
                invalidRows,
                created: validBookings.length,
                bookings: createResult.data,
                errors: hasParseErrors ? errors.map(e => ({
                    row: e.row,
                    message: e.message
                })) : []
            }
        });

    } catch (err) {
        console.error('CSV Upload Error:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Internal server error during CSV upload'
        });
    }
});

// CSV Template Download Endpoint
app.get('/api/bookings/template', (req, res) => {
    try {
        console.log('CSV Template Download Request');

        // Generate CSV template with headers and example row
        const headers = [
            'clientId',
            'bookingType',
            'scheduledDate',
            'serviceIds',
            'scheduledStartTime',
            'locationId',
            'status',
            'priority',
            'quotedPrice',
            'estimatedDurationMinutes',
            'specialInstructions',
            'serviceAddressLine1',
            'serviceAddressLine2',
            'serviceCity',
            'serviceState',
            'servicePostalCode',
            'serviceCountry',
            'recurrencePattern',
            'recurrenceEndDate',
            'tags'
        ];

        const exampleRow = [
            '00000000-0000-0000-0000-000000000000', // clientId (UUID)
            'one_time', // bookingType (one_time or recurring)
            '2026-01-20', // scheduledDate (YYYY-MM-DD)
            '00000000-0000-0000-0000-000000000001,00000000-0000-0000-0000-000000000002', // serviceIds (comma-separated UUIDs)
            '09:00:00', // scheduledStartTime (HH:MM:SS)
            '00000000-0000-0000-0000-000000000003', // locationId (UUID)
            'pending', // status
            'normal', // priority
            '150.00', // quotedPrice
            '60', // estimatedDurationMinutes
            'Please call before arrival', // specialInstructions
            '123 Main St', // serviceAddressLine1
            'Apt 4B', // serviceAddressLine2
            'Springfield', // serviceCity
            'IL', // serviceState
            '62701', // servicePostalCode
            'USA', // serviceCountry
            'weekly', // recurrencePattern (for recurring bookings)
            '2026-12-31', // recurrenceEndDate (for recurring bookings)
            'urgent,vip' // tags (comma-separated)
        ];

        // Create CSV content
        const csvContent = [
            headers.join(','),
            exampleRow.map(field => `"${field}"`).join(',')
        ].join('\n');

        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="bookings_template.csv"');

        return res.send(csvContent);

    } catch (err) {
        console.error('CSV Template Error:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Failed to generate CSV template'
        });
    }
});

// Driver Avatar Upload Endpoint
app.post('/api/drivers/:id/avatar', imageUpload.single('avatar'), async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        console.log(`Avatar upload for driver ${id}: ${req.file.originalname} (${req.file.size} bytes)`);

        const result = await driverService.uploadDriverAvatar(
            id,
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname
        );

        console.log(`Avatar upload result for driver ${id}:`, JSON.stringify(result, null, 2));

        if (!result.success) {
            console.error(`Avatar upload failed for driver ${id}:`, result.error);
            return res.status(400).json(result);
        }

        console.log(`Avatar uploaded successfully for driver ${id}: ${result.data}`);
        res.json({
            success: true,
            data: { avatarUrl: result.data }
        });

    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Driver Avatar Delete Endpoint
app.delete('/api/drivers/:id/avatar', async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`Avatar delete for driver ${id}`);

        const result = await driverService.deleteDriverAvatar(id);

        res.json(result);

    } catch (error) {
        console.error('Avatar delete error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/rpc', async (req, res) => {
    try {
        const { namespace, method, args } = req.body;

        // Improved logging: Log original args
        console.log(`[RPC] ${namespace}.${method} - Original args:`, JSON.stringify(args));

        if (!rpcMap[namespace] || !rpcMap[namespace][method]) {
            console.error(`[RPC Error] Method not found: ${namespace}.${method}`);
            if (rpcMap[namespace]) {
                console.error(`[RPC Error] Available methods for ${namespace}:`, Object.keys(rpcMap[namespace]));
            } else {
                console.error(`[RPC Error] Namespace ${namespace} not found. Available:`, Object.keys(rpcMap));
            }
            return res.status(404).json({
                error: 'Method not found',
                namespace,
                method,
                available: rpcMap[namespace] ? Object.keys(rpcMap[namespace]) : []
            });
        }

        const fn = rpcMap[namespace][method];

        // Transform snake_case to camelCase for drivers namespace (only for create/update methods)
        let transformedArgs = args;
        if (namespace === 'drivers' && (method === 'create' || method === 'update')) {
            if (Array.isArray(args) && args.length > 0) {
                // Args is an array, transform the first element
                transformedArgs = [snakeToCamel(args[0]), ...args.slice(1)];
            } else if (args && typeof args === 'object' && !Array.isArray(args)) {
                // Args is a single object, transform and wrap in array
                transformedArgs = [snakeToCamel(args)];
            }
            // Improved logging: Log transformed args
            console.log(`[RPC] ${namespace}.${method} - Transformed args:`, JSON.stringify(transformedArgs));
        }

        // Handle args: if it's an array, spread it. If not (unlikely from our verify), pass it.
        // Our client shim will send args as an array.
        const result = await fn(...(Array.isArray(transformedArgs) ? transformedArgs : [transformedArgs]));

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
                // Return data, or empty object if data is undefined (e.g., delete operations)
                return res.json(result.data !== undefined ? result.data : {});
            } else {
                // Improved error logging: Log full error details
                console.error(`[RPC Error] ${namespace}.${method} failed:`, {
                    message: result.error?.message,
                    code: result.error?.code,
                    details: result.error?.details,
                    stack: result.error?.stack
                });

                // Improved error response: Include namespace, method, and error code
                return res.status(400).json({
                    message: result.error?.message || 'Operation failed',
                    code: result.error?.code,
                    namespace,
                    method
                });
            }
        }

        // If it's not a standard result object, just return it
        return res.json(result);

    } catch (err) {
        // Safely extract namespace and method from request body (might not exist if error occurred early)
        const ns = req.body?.namespace || 'unknown';
        const mth = req.body?.method || 'unknown';

        // Improved error logging: Log full exception details
        console.error(`[RPC Exception] ${ns}.${mth}:`, {
            message: err.message,
            stack: err.stack,
            args: req.body?.args
        });

        // Improved error response: Include namespace and method
        res.status(500).json({
            message: err.message,
            namespace: ns,
            method: mth
        });
    }
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../shared/public', 'index.html'));
});

// =============================================================================
// Dispatch Service Integration (Embedded Mode)
// =============================================================================
const { initializeDispatch } = require('./dispatch-integration');

// Start server with optional dispatch integration
(async () => {
    // Initialize embedded dispatch service if DISPATCH_MODE=embedded
    try {
        await initializeDispatch(app);
    } catch (error) {
        console.error('[Server] Failed to initialize dispatch integration:', error.message);
    }

    // Start listening
    app.listen(PORT, () => {
        const url = `http://localhost:${PORT}`;
        console.log(`Server running at ${url}`);
        console.log(`Dispatch Mode: ${process.env.DISPATCH_MODE || 'standalone (default)'}`);

        // Auto-open browser (only in development)
        if (process.env.NODE_ENV !== 'production') {
            const start = (process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open');
            require('child_process').exec(start + ' ' + url);
        }
    });
})();
