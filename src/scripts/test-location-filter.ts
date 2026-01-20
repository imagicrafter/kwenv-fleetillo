
import 'dotenv/config';
import { initializeSupabase } from '../services/supabase';
import { getAllLocations } from '../services/location.service';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // Use Anon key
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing env vars');
    process.exit(1);
}

// Initialize Supabase
initializeSupabase({
    url: SUPABASE_URL,
    anonKey: SUPABASE_KEY,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY
});

async function main() {
    console.log('Testing getAllLocations filtering...');

    // 1. Get a client ID that has locations
    const allLocs = await getAllLocations();
    if (!allLocs.success || !allLocs.data?.data || allLocs.data.data.length === 0) {
        console.log('No locations found to test with.');
        return;
    }

    const testLoc = allLocs.data.data[0];
    if (!testLoc) {
        console.log('No locations found in data array.');
        return;
    }
    const customerId = testLoc.customerId;
    const customerName = testLoc.customerName;
    const locName = testLoc.name;

    console.log(`Using Test Location: "${locName}" (Customer: ${customerName}, ID: ${customerId})`);

    // 2. Test filtering by Customer ID only
    console.log('\n--- Testing Customer ID Filter ---');
    const customerLocs = await getAllLocations({ customerId: customerId! });
    console.log(`Found ${customerLocs.data?.data.length} locations for customer.`);

    // 3. Test filtering by Search Term only (partial name)
    const searchTerm = locName.substring(0, 3);
    console.log(`\n--- Testing Search Term Filter ("${searchTerm}") ---`);
    const searchLocs = await getAllLocations({ searchTerm });
    console.log(`Found ${searchLocs.data?.data.length} locations matching "${searchTerm}".`);

    // 4. Test filtering by BOTH
    console.log(`\n--- Testing BOTH Filters (Customer: ${customerId}, Search: "${searchTerm}") ---`);
    const bothLocs = await getAllLocations({ customerId: customerId!, searchTerm });
    console.log(`Found ${bothLocs.data?.data.length} locations matching both.`);

    // Check if results are correct
    const invalidResults = bothLocs.data?.data.filter((l: any) => l.customerId !== customerId);
    if (invalidResults && invalidResults.length > 0) {
        console.error('FAIL: Found locations for WRONG customer!');
        invalidResults.forEach((l: any) => console.log(` - Bad Match: ${l.name} (Customer: ${l.customerId})`));
    } else {
        console.log('PASS: All results belong to the correct customer.');
    }
}

main().catch(console.error);
