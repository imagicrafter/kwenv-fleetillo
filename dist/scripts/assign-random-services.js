"use strict";
/**
 * Script to assign random services to existing bookings
 * Services: "Pump-Out Only (Partial Clean)" or "Routine Full Pump-Out & Clean"
 * Run with: npx tsx scripts/assign-random-services.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("../src/services/supabase.js");
const index_js_1 = require("../src/config/index.js");
const SERVICE_NAMES = [
    'Pump-Out Only (Partial Clean)',
    'Routine Full Pump-Out & Clean',
];
async function assignRandomServices() {
    console.log('Initializing Supabase...');
    const initResult = (0, supabase_js_1.initializeSupabase)({
        url: index_js_1.config.supabase.url,
        anonKey: index_js_1.config.supabase.anonKey,
        serviceRoleKey: index_js_1.config.supabase.serviceRoleKey,
        schema: index_js_1.config.supabase.schema,
    });
    if (!initResult.success) {
        console.error('Failed to initialize Supabase:', initResult.error);
        process.exit(1);
    }
    const supabase = (0, supabase_js_1.getAdminSupabaseClient)();
    if (!supabase) {
        console.error('Failed to get admin Supabase client');
        process.exit(1);
    }
    // Step 1: Find or create the two services
    console.log('Finding or creating services...');
    const serviceIds = [];
    for (const serviceName of SERVICE_NAMES) {
        // Check if service exists
        const { data: existingService, error: findError } = await supabase
            .from('services')
            .select('id, name')
            .eq('name', serviceName)
            .is('deleted_at', null)
            .single();
        if (existingService) {
            console.log(`  Found existing service: ${serviceName} (${existingService.id})`);
            serviceIds.push(existingService.id);
        }
        else {
            // Create the service
            const code = serviceName === 'Pump-Out Only (Partial Clean)'
                ? 'PUMP-OUT-PARTIAL'
                : 'PUMP-OUT-FULL';
            const { data: newService, error: createError } = await supabase
                .from('services')
                .insert({
                name: serviceName,
                code: code,
                service_type: 'maintenance',
                description: serviceName,
                average_duration_minutes: serviceName === 'Pump-Out Only (Partial Clean)' ? 30 : 60,
                status: 'active',
            })
                .select('id, name')
                .single();
            if (createError) {
                console.error(`Failed to create service "${serviceName}":`, createError);
                process.exit(1);
            }
            console.log(`  Created new service: ${serviceName} (${newService.id})`);
            serviceIds.push(newService.id);
        }
    }
    // Step 2: Get all existing bookings
    console.log('\nFetching existing bookings...');
    const { data: bookings, error: fetchError } = await supabase
        .from('bookings')
        .select('id')
        .is('deleted_at', null);
    if (fetchError) {
        console.error('Failed to fetch bookings:', fetchError);
        process.exit(1);
    }
    if (!bookings || bookings.length === 0) {
        console.log('No bookings found to update.');
        process.exit(0);
    }
    console.log(`Found ${bookings.length} bookings to update.`);
    // Step 3: Update each booking with a random service
    console.log('\nAssigning random services to bookings...');
    let updatedCount = 0;
    let errorCount = 0;
    for (const booking of bookings) {
        // Randomly select one of the two services
        const randomServiceId = serviceIds[Math.floor(Math.random() * serviceIds.length)];
        const { error: updateError } = await supabase
            .from('bookings')
            .update({ service_id: randomServiceId })
            .eq('id', booking.id);
        if (updateError) {
            console.error(`  Failed to update booking ${booking.id}:`, updateError.message);
            errorCount++;
        }
        else {
            updatedCount++;
        }
    }
    console.log(`\nCompleted: ${updatedCount} bookings updated, ${errorCount} errors.`);
    // Step 4: Show summary of service assignments
    console.log('\nService assignment summary:');
    for (const serviceId of serviceIds) {
        const { count } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('service_id', serviceId)
            .is('deleted_at', null);
        const serviceName = SERVICE_NAMES[serviceIds.indexOf(serviceId)];
        console.log(`  ${serviceName}: ${count} bookings`);
    }
}
assignRandomServices().catch(console.error);
//# sourceMappingURL=assign-random-services.js.map