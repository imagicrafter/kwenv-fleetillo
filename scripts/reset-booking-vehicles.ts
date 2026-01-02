/**
 * Quick script to reset all booking vehicle_ids to null
 * Run with: npx ts-node scripts/reset-booking-vehicles.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'routeiq' }
});

async function resetVehicleIds() {
    console.log('Resetting all booking vehicle_ids to null...');

    const { data, error, count } = await supabase
        .from('bookings')
        .update({ vehicle_id: null })
        .not('vehicle_id', 'is', null)
        .select('id');

    if (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }

    console.log(`Updated ${data?.length || 0} bookings`);
    console.log('Done!');
}

resetVehicleIds();
