"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../services/supabase");
const process_1 = require("process");
async function seedLegacyBooking() {
    (0, supabase_1.initializeSupabase)();
    // Use admin client to bypass RLS
    const supabase = (0, supabase_1.getAdminSupabaseClient)() || (0, supabase_1.getSupabaseClient)();
    // Get a service and customer
    const { data: service } = await supabase.from('services').select('*').limit(1).single();
    const { data: customer } = await supabase.from('customers').select('*').limit(1).single();
    if (!service || !customer) {
        console.error('Need at least one service and customer');
        (0, process_1.exit)(1);
    }
    // Create a legacy booking with NO serviceItems and $0 price
    const bookingData = {
        booking_number: 'BK-LEGACY-TEST-001',
        customer_id: customer.id,
        service_id: service.id, // Legacy field
        scheduled_date: '2026-02-01',
        scheduled_start_time: '10:00',
        status: 'pending',
        quoted_price: 0, // checking if this gets stuck
        booking_type: 'one_time',
        service_items: null // Explicitly null to simulate legacy
    };
    const { data, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();
    if (error) {
        console.error('Failed to seed legacy booking:', error);
        (0, process_1.exit)(1);
    }
    console.log('Seeded legacy booking ID:', data.id);
    (0, process_1.exit)(0);
}
seedLegacyBooking();
//# sourceMappingURL=seed-legacy.js.map