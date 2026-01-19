"use strict";
/**
 * Script to generate test bookings for route planning
 * Run with: node dist/scripts/seed-bookings.js
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const booking_service_js_1 = require("../services/booking.service.js");
const client_service_js_1 = require("../services/client.service.js");
const service_service_js_1 = require("../services/service.service.js");
const location_service_js_1 = require("../services/location.service.js");
const supabase_js_1 = require("../services/supabase.js");
// Initialize Supabase with environment variables
(0, supabase_js_1.initializeSupabase)({
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
async function seedBookings() {
    console.log('Fetching existing data...');
    // Get clients
    const clientsResult = await (0, client_service_js_1.getClients)({}, { page: 1, limit: 100 });
    if (!clientsResult.success) {
        console.error('Error fetching clients:', clientsResult.error);
        return;
    }
    if (!clientsResult.data?.data.length) {
        console.error('No clients returned from database. Check if clients exist and permissions are correct.');
        console.log('Environment check:', {
            hasUrl: !!process.env.SUPABASE_URL,
            hasKey: !!process.env.SUPABASE_KEY,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        });
        return;
    }
    const clients = clientsResult.data.data;
    console.log(`Found ${clients.length} clients`);
    // Get services
    const servicesResult = await (0, service_service_js_1.getServices)({});
    if (!servicesResult.success || !servicesResult.data?.data?.length) {
        console.error('No services found!');
        return;
    }
    const services = servicesResult.data.data;
    console.log(`Found ${services.length} services`);
    // Get locations
    const locationsResult = await (0, location_service_js_1.getAllLocations)({});
    if (!locationsResult.success || !locationsResult.data?.data) {
        console.error('Failed to fetch locations:', locationsResult.error);
        process.exit(1);
    }
    const locations = locationsResult.data.data;
    if (locations.length === 0) {
        console.error('No locations found. Please create some locations first.');
        process.exit(1);
    }
    console.log(`Found ${locations.length} locations`);
    // Map locations to clients
    const locationsByClientId = new Map();
    locations.forEach(loc => {
        if (loc.clientId) {
            if (!locationsByClientId.has(loc.clientId)) {
                locationsByClientId.set(loc.clientId, []);
            }
            locationsByClientId.get(loc.clientId)?.push(loc);
        }
    });
    // Filter clients that have locations
    const validClients = clients.filter(c => locationsByClientId.has(c.id) && (locationsByClientId.get(c.id)?.length ?? 0) > 0);
    if (validClients.length === 0) {
        console.error('No clients with locations found. Cannot generate valid bookings.');
        return;
    }
    console.log(`Found ${validClients.length} clients with valid locations`);
    // Get Filtered Services
    const serviceNames = [
        'Pump-Out Only (Partial Clean)',
        'Routine Full Pump-Out & Clean'
    ];
    // Simple normalization for matching: remove special chars, lowercase
    const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const targetKeys = serviceNames.map(normalize);
    const validServices = services.filter(s => {
        const n = normalize(s.name);
        return targetKeys.some(k => n.includes(k) || k.includes(n));
    });
    if (validServices.length === 0) {
        console.error('Could not find the requested services:', serviceNames);
        console.log('Available services:', services.map(s => s.name));
        return;
    }
    console.log(`Found ${validServices.length} matching services:`, validServices.map(s => s.name));
    // Get database client for cleanup
    // We can use the exported getter now that it's initialized
    // But since we are in a script, let's just use the direct client creation if needed, 
    // OR, better, `initializeSupabase` usually sets a global. 
    // Let's import the one we just initialized. Ah, the function returns void or Result.
    // Let's use `createClient` from supabase-js directly or fix the usage.
    // Looking at the imports, `initializeSupabase` sets the singletons in `supabase.ts`.
    // So we should use `getAdminSupabaseClient()` or `getSupabaseClient()` AFTER init.
    // But `initializeSupabase` in `src/services/supabase.ts` might verify connection and return result.
    // Let's just assume `getAdminSupabaseClient()` works after init.
    // Actually, looking at previous code, `initializeSupabase` logic in lines 14-18 was already there.
    // I duplicated it in my replace block. I should just use `getAdminSupabaseClient()`.
    const { getAdminSupabaseClient } = await import('../services/supabase.js');
    const supabase = getAdminSupabaseClient();
    const dates = ['2026-01-19', '2026-01-20', '2026-01-21'];
    // DELETE EXISTING BOOKINGS FOR THESE DATES
    console.log('Cleaning up existing bookings for target dates...');
    let bookingNum = 1;
    let successCount = 0;
    let errorCount = 0;
    for (const dateStr of dates) {
        console.log(`\nCreating bookings for ${dateStr}...`);
        for (let i = 0; i < 15; i++) {
            const client = validClients[i % validClients.length];
            const clientLocations = locationsByClientId.get(client.id);
            const location = clientLocations[Math.floor(Math.random() * clientLocations.length)];
            // Randomly assign one of the specific services (we checked length > 0 above)
            const service = validServices[Math.floor(Math.random() * validServices.length)];
            const hour = 8 + Math.floor(i / 2);
            const minute = (i % 2) * 30;
            const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
            let endHour = hour + 1;
            let endMinute = minute;
            const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`;
            const bookingNumber = `BK-${dateStr.replace(/-/g, '')}-${(i + 1).toString().padStart(3, '0')}`;
            // Try to delete existing one first
            await supabase.from('bookings').delete().eq('booking_number', bookingNumber);
            const bookingInput = {
                clientId: client.id,
                serviceId: service.id,
                locationId: location.id,
                scheduledDate: new Date(dateStr),
                scheduledStartTime: startTime,
                scheduledEndTime: endTime,
                status: 'confirmed',
                bookingType: 'one_time',
                priority: 'normal',
                specialInstructions: `Test booking #${bookingNum}`,
                bookingNumber: bookingNumber,
            };
            const result = await (0, booking_service_js_1.createBooking)(bookingInput);
            if (result.success) {
                console.log(`  ✓ Created ${bookingInput.bookingNumber}: ${client.name} @ ${location.name} [${service.name}]`);
                successCount++;
            }
            else {
                console.error(`  ✗ Failed ${bookingInput.bookingNumber}: ${result.error?.message}`);
                errorCount++;
            }
            bookingNum++;
        }
    }
    console.log(`\n========================================`);
    console.log(`Created ${successCount} bookings, ${errorCount} errors`);
    console.log(`========================================\n`);
}
seedBookings()
    .then(() => process.exit(0))
    .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
//# sourceMappingURL=seed-bookings.js.map