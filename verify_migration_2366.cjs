const fs = require('fs');

console.log('=== Verifying Migration 001_create_drivers_table.sql ===\n');

// Read the migration file
const migrationPath = 'migrations/001_create_drivers_table.sql';
if (!fs.existsSync(migrationPath)) {
  console.error('❌ FAILED: Migration file does not exist');
  process.exit(1);
}

console.log('✅ Migration file exists');

const sqlContent = fs.readFileSync(migrationPath, 'utf8');

// Test 1: Verify CREATE TABLE statement exists
if (!sqlContent.includes('CREATE TABLE IF NOT EXISTS optiroute.drivers')) {
  console.error('❌ FAILED: CREATE TABLE statement not found');
  process.exit(1);
}
console.log('✅ CREATE TABLE optiroute.drivers found');

// Test 2: Verify all required columns exist
const requiredColumns = [
  'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
  'first_name VARCHAR(100) NOT NULL',
  'last_name VARCHAR(100) NOT NULL',
  'phone_number VARCHAR(50)',
  'email VARCHAR(255)',
  'telegram_chat_id VARCHAR(100)',
  'license_number VARCHAR(100)',
  'license_expiry DATE',
  'license_class VARCHAR(20)',
  'status VARCHAR(20) NOT NULL DEFAULT',
  'hire_date DATE',
  'emergency_contact_name VARCHAR(255)',
  'emergency_contact_phone VARCHAR(50)',
  'notes TEXT',
  'profile_image_url TEXT',
  'created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  'updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  'deleted_at TIMESTAMPTZ'
];

let missingColumns = [];
for (const column of requiredColumns) {
  if (!sqlContent.includes(column)) {
    missingColumns.push(column);
  }
}

if (missingColumns.length > 0) {
  console.error('❌ FAILED: Missing columns:', missingColumns);
  process.exit(1);
}
console.log('✅ All required columns present');

// Test 3: Verify status CHECK constraint
const statusValues = ['active', 'inactive', 'on_leave', 'terminated'];
let missingStatuses = [];
for (const status of statusValues) {
  if (!sqlContent.includes(status)) {
    missingStatuses.push(status);
  }
}

if (missingStatuses.length > 0) {
  console.error('❌ FAILED: Missing status values:', missingStatuses);
  process.exit(1);
}
console.log('✅ Status CHECK constraint includes all required values');

// Test 4: Verify indexes
const requiredIndexes = [
  'idx_drivers_status',
  'idx_drivers_email',
  'idx_drivers_phone_number',
  'idx_drivers_deleted_at'
];

let missingIndexes = [];
for (const index of requiredIndexes) {
  if (!sqlContent.includes(index)) {
    missingIndexes.push(index);
  }
}

if (missingIndexes.length > 0) {
  console.error('❌ FAILED: Missing indexes:', missingIndexes);
  process.exit(1);
}
console.log('✅ All required indexes present');

// Test 5: Verify trigger
if (!sqlContent.includes('CREATE TRIGGER update_drivers_updated_at')) {
  console.error('❌ FAILED: update_drivers_updated_at trigger not found');
  process.exit(1);
}
if (!sqlContent.includes('optiroute.update_updated_at_column()')) {
  console.error('❌ FAILED: Trigger does not call update_updated_at_column function');
  process.exit(1);
}
console.log('✅ Trigger for update_updated_at_column present');

// Test 6: Verify foreign key constraint
if (!sqlContent.includes('ALTER TABLE optiroute.vehicles')) {
  console.error('❌ FAILED: ALTER TABLE for vehicles not found');
  process.exit(1);
}
if (!sqlContent.includes('fk_vehicles_driver')) {
  console.error('❌ FAILED: fk_vehicles_driver constraint not found');
  process.exit(1);
}
if (!sqlContent.includes('assigned_driver_id')) {
  console.error('❌ FAILED: assigned_driver_id foreign key not found');
  process.exit(1);
}
if (!sqlContent.includes('REFERENCES optiroute.drivers(id)')) {
  console.error('❌ FAILED: Foreign key does not reference optiroute.drivers(id)');
  process.exit(1);
}
console.log('✅ Foreign key constraint for vehicles.assigned_driver_id present');

// Test 7: Verify default_driver_id column addition
if (!sqlContent.includes('default_driver_id')) {
  console.error('❌ FAILED: default_driver_id column addition not found');
  process.exit(1);
}
console.log('✅ default_driver_id column addition included');

// Test 8: Verify comments
if (!sqlContent.includes('COMMENT ON TABLE optiroute.drivers')) {
  console.error('❌ FAILED: Table comment not found');
  process.exit(1);
}
console.log('✅ Table comments present');

console.log('\n=== All Verification Tests Passed ✅ ===');
console.log('\nMigration Summary:');
console.log('- CREATE TABLE optiroute.drivers with all required columns');
console.log('- Status CHECK constraint with 4 values');
console.log('- 4 indexes created (status, email, phone_number, deleted_at)');
console.log('- Trigger for auto-updating updated_at timestamp');
console.log('- Foreign key constraint linking vehicles.assigned_driver_id to drivers.id');
console.log('- Conditional addition of default_driver_id column to vehicles table');
console.log('- Table and column comments for documentation');
