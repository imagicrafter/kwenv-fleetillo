// Test the snake_case to camelCase transformation logic directly

// Copy of the transformation function from server.js
function snakeToCamel(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }

    // If it's an array, recursively process each element
    if (Array.isArray(obj)) {
        return obj.map(item => snakeToCamel(item));
    }

    // If it's not an object (primitive), return as-is
    if (typeof obj !== 'object') {
        return obj;
    }

    // Convert object keys from snake_case to camelCase
    const converted = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            // Convert snake_case to camelCase
            const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
            // Recursively convert nested objects
            converted[camelKey] = snakeToCamel(obj[key]);
        }
    }
    return converted;
}

// Test cases
console.log('Testing snake_case to camelCase transformation:\n');

// Test 1: Simple driver object with snake_case fields
const test1 = {
    first_name: 'John',
    last_name: 'Doe',
    phone_number: '555-1234',
    email: 'john@example.com',
    license_number: 'DL12345',
    license_class: 'C',
    license_expiry: '2025-12-31',
    hire_date: '2024-01-01',
    assigned_vehicle_id: 123,
    emergency_contact_name: 'Jane Doe',
    emergency_contact_phone: '555-5678'
};

const result1 = snakeToCamel(test1);
console.log('Test 1: Driver data transformation');
console.log('Input (snake_case):', JSON.stringify(test1, null, 2));
console.log('\nOutput (camelCase):', JSON.stringify(result1, null, 2));

// Verify expected transformations
const expectedKeys = [
    'firstName',
    'lastName',
    'phoneNumber',
    'email',
    'licenseNumber',
    'licenseClass',
    'licenseExpiry',
    'hireDate',
    'assignedVehicleId',
    'emergencyContactName',
    'emergencyContactPhone'
];

let allCorrect = true;
for (const key of expectedKeys) {
    if (!(key in result1)) {
        console.error(`\n❌ Missing expected key: ${key}`);
        allCorrect = false;
    }
}

// Check for any snake_case keys remaining
for (const key in result1) {
    if (key.includes('_')) {
        console.error(`\n❌ Snake_case key still present: ${key}`);
        allCorrect = false;
    }
}

if (allCorrect) {
    console.log('\n✅ All field transformations correct!');
} else {
    console.log('\n❌ Some transformations failed!');
    process.exit(1);
}

// Test 2: Nested object
console.log('\n\nTest 2: Nested object transformation');
const test2 = {
    driver_info: {
        first_name: 'Jane',
        last_name: 'Smith'
    },
    contact_details: {
        phone_number: '555-9999',
        emergency_contact_name: 'John Smith'
    }
};

const result2 = snakeToCamel(test2);
console.log('Input:', JSON.stringify(test2, null, 2));
console.log('\nOutput:', JSON.stringify(result2, null, 2));

// Test 3: Array of objects
console.log('\n\nTest 3: Array transformation');
const test3 = [
    { first_name: 'Alice', last_name: 'Johnson' },
    { first_name: 'Bob', last_name: 'Williams' }
];

const result3 = snakeToCamel(test3);
console.log('Input:', JSON.stringify(test3, null, 2));
console.log('\nOutput:', JSON.stringify(result3, null, 2));

console.log('\n✅ All transformation tests completed successfully!');
process.exit(0);
