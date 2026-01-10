"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const supabase_js_1 = require("../services/supabase.js");
const route_planning_service_js_1 = require("../services/route-planning.service.js");
const supabase_js_2 = require("../services/supabase.js");
// Initialize Supabase
(0, supabase_js_1.initializeSupabase)({
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
async function verifyRouteTiming() {
    console.log('Starting Route Timing Verification...');
    const supabase = (0, supabase_js_2.getAdminSupabaseClient)();
    // Target date from the seed script
    const targetDate = new Date('2026-01-19');
    console.log(`Planning routes for ${targetDate.toISOString().split('T')[0]}...`);
    // Call the route planner
    const result = await (0, route_planning_service_js_1.planRoutes)({
        routeDate: targetDate
    });
    if (!result.success || !result.data) {
        console.error('Route planning failed:', result.error);
        return;
    }
    const { routes, unassignedBookings } = result.data;
    if (unassignedBookings.length > 0) {
        console.log(`Warning: ${unassignedBookings.length} bookings were not assigned to routes.`);
    }
    // console.log('Result Data:', JSON.stringify(result.data, null, 2));
    if (routes.length === 0) {
        console.warn('No routes created. Ensure bookings exist for 2026-01-19.');
        if (result.data.warnings?.length) {
            console.warn('Warnings:', result.data.warnings);
        }
        return;
    }
    // Verify route details
    const route = routes[0];
    if (!route)
        return;
    console.log(`\nRoute Details for ${route.routeName} (ID: ${route.id}):`);
    console.log(`- Total Duration: ${route.totalDurationMinutes} mins`);
    console.log(`- Service Time: ${route.totalServiceTimeMinutes} mins`);
    console.log(`- Travel Time: ${route.totalTravelTimeMinutes} mins`);
    console.log(`- Total Stops: ${route.totalStops}`);
    // Verify bookings timing
    console.log('\nVerifying Booking Timings:');
    // Fetch bookings for this route to check their scheduled times
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*, services(name, average_duration_minutes)')
        .in('id', route.stopSequence || [])
        .order('scheduled_start_time', { ascending: true });
    if (error) {
        console.error('Error fetching bookings:', error);
        return;
    }
    // Calculate expected totals
    const totalServiceTime = bookings?.reduce((acc, b) => acc + (b.services?.average_duration_minutes || 0), 0) || 0;
    const impliedTravelTime = (route.totalDurationMinutes || 0) - totalServiceTime;
    console.log(`- Calculated Service Time (from bookings): ${totalServiceTime} mins`);
    console.log(`- Implied Travel Time: ${impliedTravelTime} mins`);
    let previousEndTime = '08:00:00';
    bookings.forEach((booking, index) => {
        console.log(`[${index + 1}] Booking ${booking.booking_number}:`);
        console.log(`    Service: ${booking.services?.name} (Avg Duration: ${booking.services?.average_duration_minutes} min)`);
        console.log(`    Scheduled: ${booking.scheduled_start_time} - ${booking.scheduled_end_time}`);
        // Basic logic check
        if (index === 0) {
            // First booking might start after some travel time from depot (08:00)
            console.log(`    Travel from depot/prev: Start ${booking.scheduled_start_time} vs Ref ${previousEndTime}`);
        }
        else {
            console.log(`    gap check: ${booking.scheduled_start_time} >= ${previousEndTime}`);
        }
        previousEndTime = booking.scheduled_end_time;
    });
    console.log('\nVerification Complete.');
}
verifyRouteTiming()
    .then(() => process.exit(0))
    .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
//# sourceMappingURL=verify-route-timing.js.map