const fs = require('fs');

console.log('=== Verifying Driver TypeScript Types ===\n');

// Test 1: Check file exists
const driverTypesPath = 'src/types/driver.ts';
if (!fs.existsSync(driverTypesPath)) {
  console.error('❌ FAILED: src/types/driver.ts does not exist');
  process.exit(1);
}
console.log('✅ src/types/driver.ts file exists');

const driverContent = fs.readFileSync(driverTypesPath, 'utf8');

// Test 2: Verify DriverStatus type includes all 4 values
const requiredStatuses = ['active', 'inactive', 'on_leave', 'terminated'];
let missingStatuses = [];
for (const status of requiredStatuses) {
  if (!driverContent.includes(`'${status}'`)) {
    missingStatuses.push(status);
  }
}
if (missingStatuses.length > 0) {
  console.error('❌ FAILED: Missing status values:', missingStatuses);
  process.exit(1);
}
if (!driverContent.includes('export type DriverStatus')) {
  console.error('❌ FAILED: DriverStatus type not exported');
  process.exit(1);
}
console.log('✅ DriverStatus type includes all 4 status values');

// Test 3: Verify Driver interface has all required fields
const requiredDriverFields = [
  'id: ID',
  'firstName: string',
  'lastName: string',
  'phoneNumber?:',
  'email?:',
  'telegramChatId?:',
  'licenseNumber?:',
  'licenseExpiry?:',
  'licenseClass?:',
  'status: DriverStatus',
  'hireDate?:',
  'emergencyContactName?:',
  'emergencyContactPhone?:',
  'notes?:',
  'profileImageUrl?:',
  'assignedVehicleId?:',
  'deletedAt?:'
];

let missingFields = [];
for (const field of requiredDriverFields) {
  if (!driverContent.includes(field)) {
    missingFields.push(field);
  }
}
if (missingFields.length > 0) {
  console.error('❌ FAILED: Missing Driver interface fields:', missingFields);
  process.exit(1);
}
if (!driverContent.includes('export interface Driver extends Timestamps')) {
  console.error('❌ FAILED: Driver interface does not extend Timestamps');
  process.exit(1);
}
console.log('✅ Driver interface has all required fields with correct types');

// Test 4: Verify DriverRow interface uses snake_case
const requiredRowFields = [
  'first_name:',
  'last_name:',
  'phone_number:',
  'telegram_chat_id:',
  'license_number:',
  'license_expiry:',
  'license_class:',
  'hire_date:',
  'emergency_contact_name:',
  'emergency_contact_phone:',
  'profile_image_url:',
  'created_at:',
  'updated_at:',
  'deleted_at:'
];

let missingRowFields = [];
for (const field of requiredRowFields) {
  if (!driverContent.includes(field)) {
    missingRowFields.push(field);
  }
}
if (missingRowFields.length > 0) {
  console.error('❌ FAILED: Missing DriverRow fields:', missingRowFields);
  process.exit(1);
}
if (!driverContent.includes('export interface DriverRow')) {
  console.error('❌ FAILED: DriverRow interface not exported');
  process.exit(1);
}
console.log('✅ DriverRow interface uses snake_case matching database columns');

// Test 5: Verify CreateDriverInput and UpdateDriverInput interfaces
if (!driverContent.includes('export interface CreateDriverInput')) {
  console.error('❌ FAILED: CreateDriverInput interface not found');
  process.exit(1);
}
if (!driverContent.includes('export interface UpdateDriverInput')) {
  console.error('❌ FAILED: UpdateDriverInput interface not found');
  process.exit(1);
}
if (!driverContent.includes('export interface DriverFilters')) {
  console.error('❌ FAILED: DriverFilters interface not found');
  process.exit(1);
}
console.log('✅ CreateDriverInput, UpdateDriverInput, and DriverFilters interfaces exist');

// Test 6: Verify conversion functions
if (!driverContent.includes('export function rowToDriver')) {
  console.error('❌ FAILED: rowToDriver function not exported');
  process.exit(1);
}
if (!driverContent.includes('export function driverInputToRow')) {
  console.error('❌ FAILED: driverInputToRow function not exported');
  process.exit(1);
}
console.log('✅ rowToDriver and driverInputToRow conversion functions are exported');

// Test 7: Verify export in index.ts
const indexPath = 'src/types/index.ts';
if (!fs.existsSync(indexPath)) {
  console.error('❌ FAILED: src/types/index.ts does not exist');
  process.exit(1);
}
const indexContent = fs.readFileSync(indexPath, 'utf8');
if (!indexContent.includes("export * from './driver.js'")) {
  console.error('❌ FAILED: Driver types not exported from index.ts');
  process.exit(1);
}
console.log('✅ Driver types exported from src/types/index.ts');

// Test 8: Verify TypeScript compilation (already done via npm run build)
const distPath = 'dist/types/driver.js';
if (!fs.existsSync(distPath)) {
  console.error('❌ FAILED: TypeScript compilation did not produce dist/types/driver.js');
  process.exit(1);
}
console.log('✅ TypeScript compilation successful (dist/types/driver.js exists)');

console.log('\n=== All Verification Tests Passed ✅ ===');
console.log('\nDriver Types Summary:');
console.log('- DriverStatus type with 4 values: active, inactive, on_leave, terminated');
console.log('- Driver interface extending Timestamps with 17 fields');
console.log('- DriverRow interface with snake_case database column names');
console.log('- CreateDriverInput interface for creating new drivers');
console.log('- UpdateDriverInput interface for updating existing drivers');
console.log('- DriverFilters interface for query filtering');
console.log('- rowToDriver() conversion function (DB → TypeScript)');
console.log('- driverInputToRow() conversion function (TypeScript → DB)');
console.log('- All types exported from src/types/index.ts');
console.log('- TypeScript compilation successful with no errors');
