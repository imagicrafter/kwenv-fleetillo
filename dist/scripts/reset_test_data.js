"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'routeiq' }
});
async function resetData() {
    console.log('Resetting test data for 2026-01-20...');
    // 1. Unassign bookings
    const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'confirmed', route_id: null })
        .eq('scheduled_date', '2026-01-20')
        .neq('status', 'cancelled');
    if (bookingError) {
        console.error('Error resetting bookings:', bookingError);
        process.exit(1);
    }
    console.log('Bookings unassigned.');
    // 2. Fetch route IDs for cleanup
    const { data: routes, error: fetchError } = await supabase
        .from('routes')
        .select('id')
        .eq('route_date', '2026-01-20');
    if (fetchError) {
        console.error('Error fetching routes:', fetchError);
        process.exit(1);
    }
    const routeIds = routes.map(r => r.id);
    if (routeIds.length > 0) {
        // 3. Delete related dispatches
        const { error: dispatchError } = await supabase
            .from('dispatches')
            .delete()
            .in('route_id', routeIds);
        if (dispatchError) {
            console.error('Error deleting dispatches:', dispatchError);
            process.exit(1);
        }
        console.log('Related dispatches deleted.');
    }
    // 4. Delete routes
    const { error: routeError } = await supabase
        .from('routes')
        .delete()
        .eq('route_date', '2026-01-20');
    if (routeError) {
        console.error('Error deleting routes:', routeError);
        process.exit(1);
    }
    console.log('Routes deleted.');
    console.log('Reset complete.');
}
resetData();
//# sourceMappingURL=reset_test_data.js.map