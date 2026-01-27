
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

async function checkColumns() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    // Default to fleetillo schema as per config/index.js
    const schema = process.env.SUPABASE_SCHEMA || 'fleetillo';

    if (!supabaseUrl || !supabaseKey) {
        console.error('Error: SUPABASE_URL or SUPABASE_KEY not found in .env');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
        db: { schema: schema }
    });

    console.log(`Checking drivers table schema in schema "${schema}"...`);

    // Try to select the new columns from a single row
    const { data, error } = await supabase
        .from('drivers')
        .select('preferred_channel, fallback_enabled')
        .limit(1);

    if (error) {
        console.error('Error querying columns:', error.message);
        if (error.message.includes('does not exist') || error.message.includes('column')) {
            console.log('FAIL: Columns "preferred_channel" or "fallback_enabled" do not exist or table not found.');
        }
        process.exit(1);
    }

    console.log('SUCCESS: Columns exist. Query returned data structure (may be empty array if no drivers):', data ? 'Present' : 'Missing');
}

checkColumns();
