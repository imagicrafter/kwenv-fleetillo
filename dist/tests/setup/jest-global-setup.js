"use strict";
/**
 * Jest Global Setup
 *
 * Runs once before all test suites.
 * Validates database connectivity before any tests execute.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = globalSetup;
const index_js_1 = require("../../src/config/index.js");
const supabase_js_1 = require("../../src/services/supabase.js");
async function globalSetup() {
    console.log('\n' + '='.repeat(60));
    console.log('Jest Global Setup - Verifying Database Connection');
    console.log('='.repeat(60));
    console.log('');
    console.log('Database Configuration:');
    console.log(`  URL: ${index_js_1.config.supabase.url}`);
    console.log(`  Schema: ${index_js_1.config.supabase.schema}`);
    console.log(`  Environment: ${index_js_1.config.env}`);
    console.log('');
    console.log('Verifying database connection...');
    try {
        const result = await (0, supabase_js_1.initializeAndVerifySupabase)();
        if (!result.success) {
            console.error('');
            console.error('✗ Database connection failed!');
            console.error('');
            console.error('Error:', result.error?.message);
            if ('code' in (result.error || {})) {
                console.error('Code:', result.error.code);
            }
            throw new Error(`Database connection verification failed: ${result.error?.message}\n` +
                'Tests cannot proceed without a valid database connection.\n' +
                'Please check your SUPABASE_URL and SUPABASE_KEY environment variables.');
        }
        console.log(`✓ Database connected successfully (${result.data?.latencyMs}ms)`);
        console.log('');
        console.log('='.repeat(60));
        console.log('');
    }
    catch (error) {
        console.error('');
        console.error('✗ Unexpected error during database verification');
        console.error(error);
        console.error('');
        throw error;
    }
}
//# sourceMappingURL=jest-global-setup.js.map