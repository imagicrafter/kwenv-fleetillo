/**
 * Script to update newly added customers with location and tags
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

// List of customer names to update
const customerNames = [
  'Nancy Tucker',
  'Lindsey Moss',
  'Keri',
  'Chris Nix',
  'Mark',
  'Charlie Burt',
  'Natalie Moylan',
  'Susan Lintz',
  'Kasey Bake',
  'Scott',
  'Tina',
  'Bill Coday',
  'Harry Foster',
  'Craig',
  'Sean Keefe',
  'Meredith Furey',
  'Chris neighbor',
  'Lorena Taylor',
  'Dawn'
];

async function updateCustomers() {
  console.log(`Updating ${customerNames.length} customers with location and tags...`);
  console.log('');

  const results = {
    successful: [] as string[],
    failed: [] as { name: string; error: string }[]
  };

  for (const name of customerNames) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update({
          city: 'Lees Summit',
          state: 'Missouri',
          service_city: 'Lees Summit',
          service_state: 'Missouri',
          tags: ['LL']
        })
        .eq('name', name)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        throw error;
      }

      results.successful.push(name);
      console.log(`✓ Updated: ${name}`);
    } catch (error: any) {
      results.failed.push({
        name,
        error: error.message || String(error)
      });
      console.error(`✗ Failed: ${name} - ${error.message || String(error)}`);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Summary:');
  console.log(`  Successful: ${results.successful.length}`);
  console.log(`  Failed: ${results.failed.length}`);
  console.log('='.repeat(60));

  if (results.failed.length > 0) {
    console.log('');
    console.log('Failed updates:');
    results.failed.forEach(({ name, error }) => {
      console.log(`  - ${name}: ${error}`);
    });
    process.exit(1);
  }

  console.log('');
  console.log('All customers updated successfully!');
  console.log('Location: Lees Summit, Missouri');
  console.log('Tag: LL');
}

updateCustomers().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
