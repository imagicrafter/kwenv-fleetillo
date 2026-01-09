"use strict";
/**
 * Jest Global Teardown
 *
 * Runs once after all test suites complete.
 * Cleans up database connections and resources.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = globalTeardown;
const supabase_js_1 = require("../../src/services/supabase.js");
async function globalTeardown() {
    console.log('\n' + '='.repeat(60));
    console.log('Jest Global Teardown - Cleaning Up');
    console.log('='.repeat(60));
    console.log('');
    console.log('Resetting database connections...');
    (0, supabase_js_1.resetSupabaseClient)();
    console.log('✓ Cleanup complete');
    console.log('');
}
//# sourceMappingURL=jest-global-teardown.js.map