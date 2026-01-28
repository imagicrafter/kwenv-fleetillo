/**
 * Quick script to check database table counts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const schema = process.env.SUPABASE_SCHEMA || 'fleetillo';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema } });

async function checkTables() {
  console.log('Schema:', schema);
  console.log('');

  // Check customers
  const { data: customers, error: custErr } = await supabase.from('customers').select('id, name').limit(10);
  console.log('Customers:', customers?.length || 0, custErr?.message || '');
  if (customers && customers.length > 0) {
    console.log('  Sample:', customers.slice(0, 3).map(c => c.name));
  }

  // Check locations
  const { data: locations, error: locErr } = await supabase.from('locations').select('id, name, latitude, longitude').limit(20);
  console.log('Locations:', locations?.length || 0, locErr?.message || '');
  if (locations && locations.length > 0) {
    const withCoords = locations.filter(l => l.latitude !== null && l.longitude !== null).length;
    console.log(`  With coordinates: ${withCoords}/${locations.length}`);
    for (const loc of locations) {
      const hasCoords = loc.latitude !== null && loc.longitude !== null;
      const coordStr = hasCoords ? `${loc.latitude}, ${loc.longitude}` : 'null';
      console.log(`    ${hasCoords ? '✓' : '○'} ${loc.name}: ${coordStr}`);
    }
  }

  // Check bookings
  const { data: bookings, error: bookErr } = await supabase.from('bookings').select('id, scheduled_date').limit(10);
  console.log('Bookings:', bookErr?.message || (bookings?.length || 0));

  // Check drivers
  const { data: drivers, error: drvErr } = await supabase.from('drivers').select('id, name').limit(20);
  console.log('Drivers:', drivers?.length || 0, drvErr?.message || '');
  if (drivers && drivers.length > 0) {
    console.log('  Names:', drivers.map(d => d.name).join(', '));
  }

  // Check services
  const { data: services, error: svcErr } = await supabase.from('services').select('id, name').limit(10);
  console.log('Services:', services?.length || 0, svcErr?.message || '');
  if (services && services.length > 0) {
    console.log('  Names:', services.map(s => s.name).join(', '));
  }

  // Check import_batches
  const { data: batches, error: batchErr } = await supabase.from('import_batches').select('id, status, summary').order('created_at', { ascending: false }).limit(5);
  console.log('');
  console.log('Import Batches:', batches?.length || 0, batchErr?.message || '');
  if (batches && batches.length > 0) {
    for (const b of batches) {
      console.log('  Batch:', b.id.slice(0, 8), '- Status:', b.status);
      console.log('    Summary:', JSON.stringify(b.summary));
    }
  }

  // Check import_staging
  const { data: staging, error: stgErr } = await supabase.from('import_staging').select('entity_type, status');
  console.log('');
  console.log('Import Staging Records:', staging?.length || 0, stgErr?.message || '');
  if (staging && staging.length > 0) {
    const counts: Record<string, number> = {};
    for (const r of staging) {
      const key = `${r.entity_type}:${r.status}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    console.log('  By type:status:', counts);
  }
}

checkTables().catch(console.error);
