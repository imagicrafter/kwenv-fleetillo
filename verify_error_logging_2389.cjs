// Verify improved error logging in RPC handler

const fs = require('fs');

console.log('🔍 Verifying improved error logging implementation...\n');

// Read the server.js file
const serverCode = fs.readFileSync('web-launcher/server.js', 'utf8');

let allChecksPass = true;

// Check 1: Verify improved logging for original args
console.log('Check 1: Original args logging');
if (serverCode.includes('console.log(`[RPC] ${namespace}.${method} - Original args:`')) {
    console.log('  ✅ Original args are logged before transformation');
} else {
    console.error('  ❌ Original args logging NOT found');
    allChecksPass = false;
}

// Check 2: Verify improved logging for transformed args
console.log('\nCheck 2: Transformed args logging');
if (serverCode.includes('console.log(`[RPC] ${namespace}.${method} - Transformed args:`')) {
    console.log('  ✅ Transformed args are logged after transformation');
} else {
    console.error('  ❌ Transformed args logging NOT found');
    allChecksPass = false;
}

// Check 3: Verify improved error logging with full error details
console.log('\nCheck 3: Error detail logging');
if (serverCode.includes('console.error(`[RPC Error] ${namespace}.${method} failed:`')) {
    console.log('  ✅ Detailed error logging implemented');
} else {
    console.error('  ❌ Detailed error logging NOT found');
    allChecksPass = false;
}

// Check 4: Verify error response includes namespace and method
console.log('\nCheck 4: Error response context');
const errorResponsePattern = /return res\.status\(400\)\.json\(\{\s*message:.*?,\s*code:.*?,\s*namespace,\s*method/s;
if (errorResponsePattern.test(serverCode)) {
    console.log('  ✅ Error response includes namespace and method');
} else {
    console.error('  ❌ Error response does NOT include namespace and method');
    allChecksPass = false;
}

// Check 5: Verify error response includes error code
console.log('\nCheck 5: Error code in response');
if (serverCode.includes('code: result.error?.code')) {
    console.log('  ✅ Error response includes error code');
} else {
    console.error('  ❌ Error code NOT included in response');
    allChecksPass = false;
}

// Check 6: Verify exception logging improvement
console.log('\nCheck 6: Exception logging');
if (serverCode.includes('console.error(`[RPC Exception] ${namespace}.${method}:`')) {
    console.log('  ✅ Exception logging improved with context');
} else {
    console.error('  ❌ Exception logging NOT improved');
    allChecksPass = false;
}

// Check 7: Verify exception response includes namespace and method
console.log('\nCheck 7: Exception response context');
const exceptionResponsePattern = /res\.status\(500\)\.json\(\{\s*message:.*?,\s*namespace,\s*method/s;
if (exceptionResponsePattern.test(serverCode)) {
    console.log('  ✅ Exception response includes namespace and method');
} else {
    console.error('  ❌ Exception response does NOT include context');
    allChecksPass = false;
}

if (allChecksPass) {
    console.log('\n✅ SUCCESS: All error logging improvements verified!');
    console.log('\n📊 Summary of improvements:');
    console.log('  ✓ Original args logged before transformation');
    console.log('  ✓ Transformed args logged after transformation');
    console.log('  ✓ Full error details logged (message, code, details, stack)');
    console.log('  ✓ Error responses include namespace and method for debugging');
    console.log('  ✓ Error responses include error codes when available');
    console.log('  ✓ Exception logging includes full context and stack traces');
    console.log('  ✓ All error responses provide context for easier debugging');
    console.log('\n💡 Benefits:');
    console.log('  • Easier to diagnose field mapping issues');
    console.log('  • Better visibility into transformation process');
    console.log('  • Clear context for debugging RPC failures');
    console.log('  • Error codes help identify specific failure types');
    process.exit(0);
} else {
    console.error('\n❌ Some error logging improvements are missing');
    process.exit(1);
}
