const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from potential locations
const localEnv = path.join(__dirname, '../.env');
const parentEnv = path.join(__dirname, '../../.env');

dotenv.config({ path: parentEnv }); // Load parent first
dotenv.config({ path: localEnv }); // Override with local

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Env loaded from:', localEnv, 'and', parentEnv);
console.log('Supabase URL found:', !!supabaseUrl);
console.log('Supabase Key found:', !!supabaseKey);

if (supabaseKey) {
    try {
        const payload = JSON.parse(atob(supabaseKey.split('.')[1]));
        console.log('Key Role:', payload.role);
    } catch (e) {
        console.log('Could not decode key:', e.message);
    }
}

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function simulateConnection() {
    const driverId = 'bd0b9b7b-4fa6-45ac-a9c3-a0117c162b04';
    const fakeChatId = '123456789';

    console.log(`Simulating Telegram connection for driver ${driverId}...`);

    const { data, error } = await supabase
        .from('drivers')
        .update({ telegram_chat_id: fakeChatId })
        .eq('id', driverId)
        .select();

    if (error) {
        console.error('Error updating driver:', JSON.stringify(error, null, 2));
    } else {
        console.log('Success! Driver updated:', data);
    }
}

simulateConnection();
