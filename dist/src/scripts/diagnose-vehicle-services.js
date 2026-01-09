"use strict";
/**
 * Diagnostic script to verify vehicle service_types vs booking serviceIds
 * Run with: npx tsx src/scripts/diagnose-vehicle-services.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const supabase_js_1 = require("../services/supabase.js");
// Initialize Supabase with environment variables
(0, supabase_js_1.initializeSupabase)({
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
async function diagnose() {
    const supabase = (0, supabase_js_1.getAdminSupabaseClient)();
    console.log('='.repeat(80));
    console.log('DIAGNOSTIC REPORT: Vehicle-Service Matching for Route Planning');
    console.log('='.repeat(80));
    console.log();
    // 1. Get all vehicles and their service_types
    console.log('1. VEHICLES and their service_types:');
    console.log('-'.repeat(40));
    const { data: vehicles, error: vErr } = await supabase
        .from('vehicles')
        .select('id, name, status, service_types')
        .is('deleted_at', null);
    if (vErr) {
        console.error('Error fetching vehicles:', vErr);
        return;
    }
    if (!vehicles || vehicles.length === 0) {
        console.log('   No vehicles found!');
    }
    else {
        for (const v of vehicles) {
            console.log(`   ${v.name} (status: ${v.status})`);
            console.log(`   ID: ${v.id}`);
            console.log(`   service_types: ${JSON.stringify(v.service_types)}`);
            console.log();
        }
    }
    // 2. Get all services with their IDs
    console.log('2. SERVICES (id, name, service_type):');
    console.log('-'.repeat(40));
    const { data: services, error: sErr } = await supabase
        .from('services')
        .select('id, name, service_type, code')
        .is('deleted_at', null);
    if (sErr) {
        console.error('Error fetching services:', sErr);
        return;
    }
    if (!services || services.length === 0) {
        console.log('   No services found!');
    }
    else {
        for (const s of services) {
            console.log(`   "${s.name}" (code: ${s.code})`);
            console.log(`   ID: ${s.id}`);
            console.log(`   service_type: ${s.service_type}`);
            console.log();
        }
    }
    // 3. Get bookings for 2026-01-19 and their service assignments
    console.log('3. BOOKINGS for 2026-01-19 and their service_id assignments:');
    console.log('-'.repeat(40));
    const { data: bookings, error: bErr } = await supabase
        .from('bookings')
        .select('id, booking_number, service_id, services(name)')
        .eq('scheduled_date', '2026-01-19')
        .eq('status', 'confirmed')
        .is('deleted_at', null);
    if (bErr) {
        console.error('Error fetching bookings:', bErr);
        return;
    }
    if (!bookings || bookings.length === 0) {
        console.log('   No confirmed bookings found for 2026-01-19!');
    }
    else {
        console.log(`   Found ${bookings.length} confirmed bookings:`);
        console.log();
        // Group by service_id
        const byService = new Map();
        for (const b of bookings) {
            const serviceName = b.services?.name || 'Unknown';
            const existing = byService.get(b.service_id) || { name: serviceName, count: 0 };
            existing.count++;
            byService.set(b.service_id, existing);
        }
        for (const [serviceId, info] of byService) {
            console.log(`   Service: "${info.name}"`);
            console.log(`   Service ID: ${serviceId}`);
            console.log(`   Bookings count: ${info.count}`);
            console.log();
        }
    }
    // 4. Analysis
    console.log('4. ANALYSIS:');
    console.log('-'.repeat(40));
    if (vehicles && services && bookings) {
        // Get unique service IDs from bookings
        const bookingServiceIds = new Set(bookings.map(b => b.service_id));
        console.log('   Service IDs needed for bookings:');
        for (const sid of bookingServiceIds) {
            const service = services.find(s => s.id === sid);
            console.log(`     - ${sid} ("${service?.name || 'Unknown'}")`);
        }
        console.log();
        console.log('   Checking vehicle coverage:');
        for (const v of vehicles) {
            console.log(`   Vehicle: "${v.name}"`);
            const vehicleServiceTypes = v.service_types || [];
            console.log(`     Current service_types in vehicle: ${JSON.stringify(vehicleServiceTypes)}`);
            // Check which booking services are covered
            const coveredServices = [];
            const missingServices = [];
            for (const sid of bookingServiceIds) {
                const service = services.find(s => s.id === sid);
                // Check if vehicle's service_types contains this service ID
                if (vehicleServiceTypes.includes(sid)) {
                    coveredServices.push(`${sid} ("${service?.name}")`);
                }
                else {
                    missingServices.push(`${sid} ("${service?.name}")`);
                }
            }
            if (coveredServices.length > 0) {
                console.log(`     ✓ Covers service IDs: ${coveredServices.join(', ')}`);
            }
            if (missingServices.length > 0) {
                console.log(`     ✗ MISSING service IDs: ${missingServices.join(', ')}`);
            }
            console.log();
        }
        // Check if service_types contains service_type strings instead of IDs
        console.log('   Checking for service_type (category) vs service ID mismatch:');
        for (const v of vehicles) {
            const vehicleServiceTypes = v.service_types || [];
            for (const vst of vehicleServiceTypes) {
                // Check if this looks like a UUID
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vst);
                if (!isUuid) {
                    console.log(`     ⚠ Vehicle "${v.name}" has non-UUID value in service_types: "${vst}"`);
                    // Check if it matches any service's service_type field
                    const matchingServiceType = services.filter(s => s.service_type === vst);
                    if (matchingServiceType.length > 0) {
                        console.log(`       This matches service_type category for services:`);
                        for (const ms of matchingServiceType) {
                            console.log(`         - "${ms.name}" (ID: ${ms.id})`);
                        }
                    }
                }
            }
        }
    }
    console.log();
    console.log('='.repeat(80));
    console.log('END OF DIAGNOSTIC REPORT');
    console.log('='.repeat(80));
}
diagnose()
    .then(() => process.exit(0))
    .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
//# sourceMappingURL=diagnose-vehicle-services.js.map