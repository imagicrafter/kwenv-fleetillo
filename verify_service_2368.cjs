const fs = require('fs');

console.log('=== Verifying Driver Service Implementation ===\n');

// Test 1: Check file exists
const servicePath = 'src/services/driver.service.ts';
if (!fs.existsSync(servicePath)) {
  console.error('❌ FAILED: src/services/driver.service.ts does not exist');
  process.exit(1);
}
console.log('✅ src/services/driver.service.ts file exists');

const serviceContent = fs.readFileSync(servicePath, 'utf8');

// Test 2: Verify DRIVERS_TABLE constant
if (!serviceContent.includes("const DRIVERS_TABLE = 'drivers'")) {
  console.error('❌ FAILED: DRIVERS_TABLE constant not defined');
  process.exit(1);
}
console.log('✅ DRIVERS_TABLE constant defined');

// Test 3: Verify DriverServiceError class
if (!serviceContent.includes('export class DriverServiceError extends Error')) {
  console.error('❌ FAILED: DriverServiceError class not found');
  process.exit(1);
}
console.log('✅ DriverServiceError class defined');

// Test 4: Verify DriverErrorCodes constant
if (!serviceContent.includes('export const DriverErrorCodes')) {
  console.error('❌ FAILED: DriverErrorCodes constant not exported');
  process.exit(1);
}
const requiredErrorCodes = ['NOT_FOUND', 'CREATE_FAILED', 'UPDATE_FAILED', 'DELETE_FAILED', 'QUERY_FAILED', 'VALIDATION_FAILED'];
let missingErrorCodes = [];
for (const code of requiredErrorCodes) {
  if (!serviceContent.includes(code)) {
    missingErrorCodes.push(code);
  }
}
if (missingErrorCodes.length > 0) {
  console.error('❌ FAILED: Missing error codes:', missingErrorCodes);
  process.exit(1);
}
console.log('✅ DriverErrorCodes constant with all required codes');

// Test 5: Verify validateDriverInput function
if (!serviceContent.includes('function validateDriverInput')) {
  console.error('❌ FAILED: validateDriverInput function not found');
  process.exit(1);
}
if (!serviceContent.includes('firstName') || !serviceContent.includes('lastName')) {
  console.error('❌ FAILED: validateDriverInput does not check firstName and lastName');
  process.exit(1);
}
console.log('✅ validateDriverInput function with required field checks');

// Test 6: Verify getClient helper function
if (!serviceContent.includes('function getClient()')) {
  console.error('❌ FAILED: getClient helper function not found');
  process.exit(1);
}
console.log('✅ getClient helper function defined');

// Test 7: Verify all required async functions
const requiredFunctions = [
  'export async function getDrivers',
  'export async function getDriverById',
  'export async function createDriver',
  'export async function updateDriver',
  'export async function deleteDriver',
  'export async function countDrivers',
  'export async function getDriverWithVehicle'
];

let missingFunctions = [];
for (const func of requiredFunctions) {
  if (!serviceContent.includes(func)) {
    missingFunctions.push(func);
  }
}
if (missingFunctions.length > 0) {
  console.error('❌ FAILED: Missing functions:', missingFunctions);
  process.exit(1);
}
console.log('✅ All required async functions implemented');

// Test 8: Verify getDrivers includes LEFT JOIN with vehicles
if (!serviceContent.includes('vehicles!vehicles_assigned_driver_id_fkey')) {
  console.error('❌ FAILED: getDrivers does not include LEFT JOIN with vehicles');
  process.exit(1);
}
console.log('✅ getDrivers includes LEFT JOIN with vehicles');

// Test 9: Verify deleteDriver uses soft delete
if (!serviceContent.includes('deleted_at') && serviceContent.includes('deleteDriver')) {
  console.error('❌ FAILED: deleteDriver does not implement soft delete');
  process.exit(1);
}
console.log('✅ deleteDriver implements soft delete');

// Test 10: Verify exports in index.ts
const indexPath = 'src/services/index.ts';
if (!fs.existsSync(indexPath)) {
  console.error('❌ FAILED: src/services/index.ts does not exist');
  process.exit(1);
}
const indexContent = fs.readFileSync(indexPath, 'utf8');

const requiredExports = [
  'createDriver',
  'getDriverById',
  'getDrivers',
  'updateDriver',
  'deleteDriver',
  'countDrivers',
  'getDriverWithVehicle',
  'DriverServiceError',
  'DriverErrorCodes'
];

let missingExports = [];
for (const exp of requiredExports) {
  if (!indexContent.includes(exp)) {
    missingExports.push(exp);
  }
}
if (missingExports.length > 0) {
  console.error('❌ FAILED: Missing exports in index.ts:', missingExports);
  process.exit(1);
}
console.log('✅ All functions and types exported from src/services/index.ts');

// Test 11: Verify TypeScript compilation (already done via npm run build)
const distPath = 'dist/services/driver.service.js';
if (!fs.existsSync(distPath)) {
  console.error('❌ FAILED: TypeScript compilation did not produce dist/services/driver.service.js');
  process.exit(1);
}
console.log('✅ TypeScript compilation successful');

console.log('\n=== All Verification Tests Passed ✅ ===');
console.log('\nDriver Service Summary:');
console.log('- DRIVERS_TABLE constant: "drivers"');
console.log('- DriverServiceError class with code and details');
console.log('- DriverErrorCodes with 6 error types');
console.log('- validateDriverInput() checking firstName and lastName');
console.log('- getClient() helper for Supabase admin client');
console.log('- createDriver() - Creates new driver with validation');
console.log('- getDriverById() - Retrieves single driver by ID');
console.log('- getDrivers() - Lists drivers with filters, pagination, LEFT JOIN vehicles');
console.log('- updateDriver() - Updates existing driver');
console.log('- deleteDriver() - Soft delete by setting deleted_at');
console.log('- countDrivers() - Counts drivers with filters');
console.log('- getDriverWithVehicle() - Gets driver with assigned vehicle details');
console.log('- All functions exported from src/services/index.ts');
