import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'fleetillo' }
});

async function verifySchema() {
    console.log('Verifying schema changes...\n');

    // Query the information schema to check columns
    const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'fleetillo')
        .eq('table_name', 'bookings')
        .in('column_name', ['service_id', 'service_ids', 'service_items'])
        .order('column_name');

    if (error) {
        console.error('Error querying schema:', error);

        // Try an alternative method - attempt to query a booking with the new columns
        console.log('\nTrying alternative verification method...');
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('id, service_id, service_ids, service_items')
            .limit(1)
            .single();

        if (bookingError) {
            console.error('Error:', bookingError.message);
            if (bookingError.message.includes('service_ids')) {
                console.error('❌ Migration may not have been applied correctly - service_ids column not found');
            } else {
                console.log('✅ Columns exist! Error:', bookingError.message);
            }
        } else {
            console.log('✅ Successfully queried new columns!');
            console.log('Sample booking:', JSON.stringify(booking, null, 2));
        }
    } else {
        console.log('Schema query results:');
        console.table(data);
        console.log('\n✅ Schema verification complete!');
    }
}

verifySchema().catch(console.error);
