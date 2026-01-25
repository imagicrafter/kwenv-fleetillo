/**
 * Script to verify the final customer data
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SCHEMA = process.env.SUPABASE_SCHEMA || 'fleetillo';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: SCHEMA }
});

async function verifyCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('name, phone, city, state, tags')
    .contains('tags', ['LL'])
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching customers:', error);
    process.exit(1);
  }

  console.log(`\nCustomers with 'LL' tag (${data.length} total):\n`);
  console.log('Name'.padEnd(25), 'Phone'.padEnd(20), 'Location'.padEnd(25), 'Tags');
  console.log('='.repeat(95));

  data.forEach((customer) => {
    const name = customer.name.padEnd(25);
    const phone = (customer.phone || 'N/A').padEnd(20);
    const location = `${customer.city || 'N/A'}, ${customer.state || 'N/A'}`.padEnd(25);
    const tags = customer.tags ? customer.tags.join(', ') : 'N/A';
    console.log(`${name} ${phone} ${location} ${tags}`);
  });
}

verifyCustomers().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
