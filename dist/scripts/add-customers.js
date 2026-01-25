"use strict";
/**
 * Script to add new customers to the Fleetillo database
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SCHEMA = process.env.SUPABASE_SCHEMA || 'fleetillo';
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: Missing required environment variables');
    console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
    process.exit(1);
}
// Create Supabase client with service role key (bypasses RLS)
const supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: SCHEMA }
});
// Customer data to insert
const customersToAdd = [
    { name: 'Nancy Tucker', phone: '816-804-2254' },
    { name: 'Lindsey Moss', phone: '816-665-2739' },
    { name: 'Keri', phone: '918-260-4091' },
    { name: 'Chris Nix', phone: '816-289-5976' },
    { name: 'Mark', phone: '816-509-9223' },
    { name: 'Charlie Burt', phone: '816-718-9955' },
    { name: 'Natalie Moylan', phone: null },
    { name: 'Susan Lintz', phone: '816-916-6333' },
    { name: 'Kasey Bake', phone: '816-935-5302' },
    { name: 'Scott', phone: '816-678-7268' },
    { name: 'Tina', phone: '816-392-2023' },
    { name: 'Bill Coday', phone: '816-868-2058' },
    { name: 'Harry Foster', phone: '816-803-4000' },
    { name: 'Craig', phone: null },
    { name: 'Sean Keefe', phone: '352-246-4330' },
    { name: 'Meredith Furey', phone: '816-588-6981' },
    { name: 'Chris neighbor', phone: '816-217-0623' },
    { name: 'Lorena Taylor', phone: '816-308-2605' },
    { name: 'Dawn', phone: '816-377-0195' }
];
async function addCustomers() {
    console.log(`Adding ${customersToAdd.length} customers to ${SCHEMA}.customers...`);
    console.log('');
    const results = {
        successful: [],
        failed: []
    };
    for (const customer of customersToAdd) {
        try {
            const { data, error } = await supabase
                .from('customers')
                .insert({
                name: customer.name,
                phone: customer.phone,
                status: 'active'
            })
                .select()
                .single();
            if (error) {
                throw error;
            }
            results.successful.push(customer.name);
            console.log(`✓ Added: ${customer.name}${customer.phone ? ` (${customer.phone})` : ''}`);
        }
        catch (error) {
            results.failed.push({
                name: customer.name,
                error: error.message || String(error)
            });
            console.error(`✗ Failed: ${customer.name} - ${error.message || String(error)}`);
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
        console.log('Failed customers:');
        results.failed.forEach(({ name, error }) => {
            console.log(`  - ${name}: ${error}`);
        });
        process.exit(1);
    }
    console.log('');
    console.log('All customers added successfully!');
}
// Run the script
addCustomers().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
//# sourceMappingURL=add-customers.js.map