"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const path_1 = __importDefault(require("path"));
// Load env vars from root immediately
(0, dotenv_1.config)({ path: path_1.default.resolve(process.cwd(), '.env') });
async function run() {
    console.log('Starting route planning reproduction script...');
    // Import services dynamically after env is set
    const { initializeSupabase } = await import('../services/supabase.js');
    const { planRoutes, previewRoutePlan } = await import('../services/route-planning.service.js');
    // Initialize Supabase
    const initResult = initializeSupabase();
    if (!initResult.success) {
        console.error('Failed to initialize Supabase:', initResult.error);
        return;
    }
    console.log('Supabase initialized.');
    // Date known to have bookings from previous context
    const routeDate = '2026-01-20';
    console.log(`\n--- PREVIEW STEP for ${routeDate} ---`);
    try {
        const preview = await previewRoutePlan({ routeDate });
        if (!preview.success || !preview.data) {
            console.error('Preview failed or no data:', preview.error);
        }
        else {
            console.log('Preview success!');
            console.log(`- Bookings found: ${preview.data.bookings.length}`);
            console.log(`- Vehicles found: ${preview.data.vehicles.length}`);
            console.log(`- Unassignable: ${preview.data.unassignableBookings.length}`);
            if (preview.data.warnings.length > 0) {
                console.log('Preview Warnings:', preview.data.warnings);
            }
        }
    }
    catch (error) {
        console.error('Preview threw error:', error);
    }
    console.log(`\n--- PLANNING STEP for ${routeDate} ---`);
    try {
        const plan = await planRoutes({
            routeDate,
            routingPreference: 'TRAFFIC_UNAWARE',
            maxStopsPerRoute: 15
        });
        if (!plan.success || !plan.data) {
            console.error('Planning failed:', plan.error);
            return;
        }
        console.log('Planning success!');
        console.log('Summary:', plan.data.summary);
        console.log(`- Routes Created: ${plan.data.routes.length}`);
        plan.data.routes.forEach((route, index) => {
            console.log(`Route ${index + 1}: ID=${route.id}, Stops=${route.totalStops}, Start=${route.plannedStartTime}, End=${route.plannedEndTime}`);
        });
        console.log(`- Unassigned Bookings: ${plan.data.unassignedBookings.length}`);
        if (plan.data.warnings.length > 0) {
            console.log('Planning Warnings:', plan.data.warnings);
        }
    }
    catch (error) {
        console.error('Planning threw error:', error);
    }
    console.log('\nDone.');
    process.exit(0);
}
run();
//# sourceMappingURL=reproduce_route_planning.js.map