const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the root .env file
// Load environment variables from the root .env file
const envPath = path.join(__dirname, '../../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Failed to load .env file:', result.error);
} else {
  console.log('Loaded .env file from:', envPath);
  console.log('SUPABASE_URL present:', !!process.env.SUPABASE_URL);
  console.log('SUPABASE_KEY present:', !!process.env.SUPABASE_KEY);
  console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('SUPABASE_SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY.length);
  }
}

// Import the compiled service
// Note: This assumes npm run build has been run in the root
const {
  getClients,
  createClient,
  updateClient,
  deleteClient,
  getClient
} = require('../../dist/services/client.service.js');
const {
  getServices,
  createService,
  updateService,
  deleteService,
  getService
} = require('../../dist/services/service.service.js');
const {
  getBookings,
  createBooking,
  updateBooking,
  deleteBooking,
  getBookingById
} = require('../../dist/services/booking.service.js');
const {
  getAllLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  getLocationById
} = require('../../dist/services/location.service.js');
const {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleById
} = require('../../dist/services/vehicle.service.js');
const {
  getRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  getRouteById,
  getNextAvailableRouteDate,
  getRouteStatsByDateRange
} = require('../../dist/services/route.service.js');
const { planRoutes, previewRoutePlan } = require('../../dist/services/route-planning.service.js');
const {
  getPlaceAutocomplete,
  geocodeAddress
} = require('../../dist/services/googlemaps.service.js');
const {
  getVehicleLocations,
  setVehicleLocations,
  addVehicleLocation,
  removeVehicleLocation,
  setVehiclePrimaryLocation
} = require('../../dist/services/vehicle-location.service.js');
const { initializeSupabase } = require('../../dist/services/supabase.js');

function setupIpcHandlers() {
  // Initialize Supabase first with explicit config from process.env
  const initResult = initializeSupabase({
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    schema: process.env.SUPABASE_SCHEMA || 'routeiq'
  });

  if (!initResult.success) {
    console.error('Failed to initialize Supabase:', initResult.error);
  } else {
    console.log('Supabase initialized successfully (with manual config override)');
  }

  ipcMain.handle('clients:getAll', async (event, filters, pagination) => {
    const result = await getClients(filters, pagination);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch clients');
    }
    return result.data;
  });

  ipcMain.handle('clients:create', async (event, input, options) => {
    const result = await createClient(input, options);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to create client');
    }
    return result.data;
  });

  ipcMain.handle('clients:update', async (event, input) => {
    const result = await updateClient(input);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to update client');
    }
    return result.data;
  });

  ipcMain.handle('clients:delete', async (event, id) => {
    const result = await deleteClient(id);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to delete client');
    }
    return result.success;
  });

  ipcMain.handle('clients:getById', async (event, id) => {
    const result = await getClient(id);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to get client');
    }
    return result.data;
  });

  // Services IPC Handlers
  ipcMain.handle('services:getAll', async (event, filters, pagination) => {
    const result = await getServices(filters, pagination);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch services');
    }
    return result.data;
  });

  ipcMain.handle('services:create', async (event, input) => {
    const result = await createService(input);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to create service');
    }
    return result.data;
  });

  ipcMain.handle('services:update', async (event, input) => {
    const result = await updateService(input);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to update service');
    }
    return result.data;
  });

  ipcMain.handle('services:delete', async (event, id) => {
    const result = await deleteService(id);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to delete service');
    }
    return result.success;
  });

  ipcMain.handle('services:getById', async (event, id) => {
    const result = await getService(id);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to get service');
    }
    return result.data;
  });

  // Bookings IPC Handlers
  ipcMain.handle('bookings:getAll', async (event, filters, pagination) => {
    const result = await getBookings(filters, pagination);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch bookings');
    }
    return result.data;
  });

  ipcMain.handle('bookings:create', async (event, input) => {
    const result = await createBooking(input);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to create booking');
    }
    return result.data;
  });

  ipcMain.handle('bookings:update', async (event, input) => {
    const result = await updateBooking(input);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to update booking');
    }
    return result.data;
  });

  ipcMain.handle('bookings:delete', async (event, id) => {
    const result = await deleteBooking(id);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to delete booking');
    }
    return result.success;
  });

  ipcMain.handle('bookings:getById', async (event, id) => {
    const result = await getBookingById(id);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch booking');
    }
    return result.data;
  });

  // Locations IPC Handlers
  ipcMain.handle('locations:getAll', async (event, filters, pagination) => {
    const result = await getAllLocations(filters, pagination);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch locations');
    }
    return result.data;
  });

  ipcMain.handle('locations:create', async (event, input) => {
    const result = await createLocation(input);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to create location');
    }
    return result.data;
  });

  ipcMain.handle('locations:update', async (event, input) => {
    const result = await updateLocation(input);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to update location');
    }
    return result.data;
  });

  ipcMain.handle('locations:delete', async (event, id) => {
    const result = await deleteLocation(id);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to delete location');
    }
    return result.success;
  });

  ipcMain.handle('locations:getById', async (event, id) => {
    const result = await getLocationById(id);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch location');
    }
    return result.data;
  });

  // Vehicle IPC Handlers
  ipcMain.handle('vehicles:getAll', async (event, filters, pagination) => {
    const result = await getVehicles(filters, pagination);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch vehicles');
    }
    return result.data;
  });

  ipcMain.handle('vehicles:create', async (event, input) => {
    const result = await createVehicle(input);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to create vehicle');
    }
    return result.data;
  });

  ipcMain.handle('vehicles:update', async (event, input) => {
    const result = await updateVehicle(input);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to update vehicle');
    }
    return result.data;
  });

  ipcMain.handle('vehicles:delete', async (event, id) => {
    const result = await deleteVehicle(id);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to delete vehicle');
    }
    return result.success;
  });

  ipcMain.handle('vehicles:getById', async (event, id) => {
    const result = await getVehicleById(id);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch vehicle');
    }
    return result.data;
  });

  // Vehicle Locations IPC Handlers
  ipcMain.handle('vehicleLocations:getByVehicle', async (event, vehicleId) => {
    const result = await getVehicleLocations(vehicleId);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch vehicle locations');
    }
    return result.data;
  });

  ipcMain.handle('vehicleLocations:set', async (event, vehicleId, locations) => {
    const result = await setVehicleLocations(vehicleId, locations);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to set vehicle locations');
    }
    return result.data;
  });

  ipcMain.handle('vehicleLocations:add', async (event, vehicleId, locationId, isPrimary) => {
    const result = await addVehicleLocation(vehicleId, locationId, isPrimary);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to add vehicle location');
    }
    return result.data;
  });

  ipcMain.handle('vehicleLocations:remove', async (event, vehicleId, locationId) => {
    const result = await removeVehicleLocation(vehicleId, locationId);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to remove vehicle location');
    }
    return result.success;
  });

  ipcMain.handle('vehicleLocations:setPrimary', async (event, vehicleId, locationId) => {
    const result = await setVehiclePrimaryLocation(vehicleId, locationId);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to set primary location');
    }
    return result.success;
  });

  // Routes IPC Handlers
  ipcMain.handle('routes:getAll', async (event, filters, pagination) => {
    const result = await getRoutes(filters, pagination);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch routes');
    }
    return result.data;
  });

  ipcMain.handle('routes:create', async (event, input) => {
    const result = await createRoute(input);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to create route');
    }
    return result.data;
  });

  ipcMain.handle('routes:update', async (event, input) => {
    const result = await updateRoute(input);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to update route');
    }
    return result.data;
  });

  ipcMain.handle('routes:delete', async (event, id) => {
    const result = await deleteRoute(id);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to delete route');
    }
    return result.success;
  });

  ipcMain.handle('routes:getById', async (event, id) => {
    const result = await getRouteById(id);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch route');
    }
    return result.data;
  });

  ipcMain.handle('routes:getNextAvailableDate', async (event, fromDate) => {
    // Pass raw string or date object converted to local ISO date part if possible
    // But getNextAvailableRouteDate expects Date object for the "from" query param logic in service (still)
    // Wait, I updated service to take Date but return string.
    // Let's pass the Date object as before, as service expects Date for "fromDate" arg.
    const date = typeof fromDate === 'string' ? new Date(fromDate) : fromDate;
    const result = await getNextAvailableRouteDate(date);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to get next available route date');
    }
    return result.data;
  });

  ipcMain.handle('routes:getStatsByDateRange', async (event, startDate, endDate) => {
    // Service now expects startDateStr, endDateStr
    // We expect frontend to pass YYYY-MM-DD strings.
    // If frontend passes strings, use them. 
    // If frontend passes dates (which serialize to ISO strings), we should extract YYYY-MM-DD.

    // Helper to get YYYY-MM-DD from various inputs
    const getYMD = (input) => {
      if (typeof input === 'string') {
        // Check if it's ISO like 2026-01-01T...
        if (input.includes('T')) return input.split('T')[0];
        return input;
      }
      if (input instanceof Date) {
        return input.toISOString().split('T')[0];
      }
      return input;
    };

    const startStr = getYMD(startDate);
    const endStr = getYMD(endDate);

    const result = await getRouteStatsByDateRange(startStr, endStr);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to get route stats');
    }
    return result.data;
  });

  ipcMain.handle('routes:plan', async (event, input) => {
    const result = await planRoutes(input);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to plan routes');
    }
    return result.data;
  });

  ipcMain.handle('routes:previewPlan', async (event, input) => {
    const result = await previewRoutePlan(input);
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to preview route plan');
    }
    return result.data;
  });

  // Geocoding IPC Handlers
  ipcMain.handle('geocoding:autocomplete', async (event, input) => {
    const result = await getPlaceAutocomplete(input);
    if (!result.success) {
      throw new Error(result.error?.message || 'Autocomplete failed');
    }
    return result.data;
  });

  ipcMain.handle('geocoding:geocodeAddress', async (event, address) => {
    const result = await geocodeAddress({ address });
    if (!result.success) {
      throw new Error(result.error?.message || 'Geocoding failed');
    }
    return result.data;
  });

  // Config handlers
  ipcMain.handle('config:getGoogleMapsApiKey', async () => {
    return process.env.GOOGLE_MAPS_API_KEY || '';
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    // Dark theme window frame usually looks better
    backgroundColor: '#1a1a1a',
    titleBarStyle: 'hiddenInset', // Mac-style unified title bar
  });

  mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  console.log('App ready, setting up IPC handlers...');
  try {
    setupIpcHandlers();
    console.log('IPC handlers set up successfully.');
  } catch (error) {
    console.error('Failed to setup IPC handlers:', error);
  }
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
