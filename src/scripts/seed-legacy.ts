import { getAdminSupabaseClient, getSupabaseClient, initializeSupabase } from '../services/supabase.js';
import { exit } from 'process';

async function seedLegacyBooking() {
    initializeSupabase();
    // Use admin client to bypass RLS
    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    // Get a service and customer
    const { data: service } = await supabase.from('services').select('*').limit(1).single();
    const { data: customer } = await supabase.from('customers').select('*').limit(1).single();

    if (!service || !customer) {
        console.error('Need at least one service and customer');
        exit(1);
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
        exit(1);
    }

    console.log('Seeded legacy booking ID:', data.id);
    exit(0);
}

seedLegacyBooking();
