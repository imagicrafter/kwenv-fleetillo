import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const log = (msg: string) => console.log(`[VERIFY] ${msg}`);

async function main() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

    if (!url || !key) {
        throw new Error("Missing Supabase credentials in .env");
    }

    const supabase = createClient(url, key, {
        db: { schema: 'fleetillo' }
    });

    log("Connected to Supabase. Checking for existing data...");

    // 1. Find a suitable route with bookings and a vehicle
    // We look for a route that has a vehicle and at least one booking
    const { data: routes, error: routeError } = await supabase
        .from('routes')
        .select(`
            id, 
            route_name, 
            stop_sequence, 
            vehicle_id,
            vehicle:vehicles(name)
        `)
        .not('vehicle_id', 'is', null)
        .order('route_date', { ascending: false })
        .limit(5);

    if (routeError) throw routeError;

    let targetBookingId;
    let targetRouteName;
    let targetVehicleName;

    // Filter routes to find one with actual bookings in stop_sequence
    let foundRoute = null;
    if (routes) {
        for (const r of routes) {
            if (r.stop_sequence && r.stop_sequence.length > 0) {
                foundRoute = r;
                break;
            }
        }
    }

    if (foundRoute) {
        targetBookingId = foundRoute.stop_sequence[0]; // Take first booking
        targetRouteName = foundRoute.route_name;
        // @ts-ignore
        targetVehicleName = foundRoute.vehicle?.name;

        log(`Found existing route: "${targetRouteName}" with vehicle "${targetVehicleName}" and booking ${targetBookingId}`);
    } else {
        log("No suitable existing data found. Creating test data...");

        // 1. Get/Create Client
        const { data: clients } = await supabase.from('clients').select('id').limit(1);
        let clientId = clients?.[0]?.id;
        if (!clientId) {
            const { data: newClient } = await supabase.from('clients').insert({
                name: 'Test Client Activity Log',
                email: 'test@example.com'
            }).select('id').single();
            clientId = newClient.id;
        }

        // 2. Get/Create Service
        const { data: services } = await supabase.from('services').select('id').limit(1);
        let serviceId = services?.[0]?.id;
        if (!serviceId) {
            const { data: newService } = await supabase.from('services').insert({
                name: 'Test Service',
                duration_minutes: 60,
                price: 100
            }).select('id').single();
            serviceId = newService.id;
        }

        // 3. Get/Create Vehicle
        const { data: vehicles } = await supabase.from('vehicles').select('id, name').limit(1);
        let vehicleId = vehicles?.[0]?.id;
        targetVehicleName = vehicles?.[0]?.name;
        if (!vehicleId) {
            const { data: newVehicle } = await supabase.from('vehicles').insert({
                name: 'Test Vehicle Activity',
                status: 'available'
            }).select('id, name').single();
            vehicleId = newVehicle.id;
            targetVehicleName = newVehicle.name;
        } else {
            targetVehicleName = vehicles[0].name;
        }

        // 4. Create Booking
        const { data: newBooking } = await supabase.from('bookings').insert({
            client_id: clientId,
            service_id: serviceId,
            status: 'pending',
            scheduled_date: new Date().toISOString().split('T')[0],
            booking_type: 'one_time',
            booking_number: `TST-${Date.now()}`
        }).select('id').single();
        targetBookingId = newBooking.id;

        // 5. Create Route
        targetRouteName = `Test Route ${Date.now()}`;
        const { data: newRoute } = await supabase.from('routes').insert({
            route_name: targetRouteName,
            route_date: new Date().toISOString().split('T')[0],
            status: 'draft',
            vehicle_id: vehicleId,
            stop_sequence: [targetBookingId],
            total_distance_meters: 0,
            total_duration_minutes: 0
        }).select('id').single();

        log(`Created test data: Route "${targetRouteName}", Vehicle "${targetVehicleName}", Booking ${targetBookingId}`);
    }

    // Toggle status to trigger update
    // First ensure it's not 'in_progress' to make the change valid
    const { data: currentBooking } = await supabase.from('bookings').select('status').eq('id', targetBookingId).single();

    let nextStatus = 'in_progress';
    if (currentBooking.status === 'in_progress') {
        nextStatus = 'completed';
    }

    log(`Updating booking ${targetBookingId} status from '${currentBooking.status}' to '${nextStatus}'...`);
    const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: nextStatus })
        .eq('id', targetBookingId);

    if (updateError) throw updateError;

    // Check logs
    log("Waiting for trigger to generate log...");
    await new Promise(r => setTimeout(r, 1000));

    const { data: logs, error: logError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('entity_id', targetBookingId)
        .eq('entity_type', 'booking')
        .order('created_at', { ascending: false })
        .limit(1);

    if (logError) throw logError;

    if (!logs || logs.length === 0) {
        log("ERROR: No activity logs found!");
        process.exit(1);
    }

    const latestLog = logs[0];
    log(`Latest Log Title: "${latestLog.title}"`);
    log(`Latest Log Action: "${latestLog.action}"`);

    // Verify
    const routeNameCheck = latestLog.title.includes(targetRouteName);
    const vehicleNameCheck = latestLog.title.includes(targetVehicleName);

    if (routeNameCheck && vehicleNameCheck) {
        log("✅ SUCCESS: Title contains both Route Name and Vehicle Name.");
        process.exit(0);
    } else {
        log(`❌ FAILURE: Missing information in title.`);
        log(`Expected Route Name: "${targetRouteName}" -> Valid? ${routeNameCheck}`);
        log(`Expected Vehicle Name: "${targetVehicleName}" -> Valid? ${vehicleNameCheck}`);
        process.exit(1);
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
