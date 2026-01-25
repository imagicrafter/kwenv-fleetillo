"use strict";
/**
 * Script to update newly added customers with location and tags
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
dotenv.config();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SCHEMA = process.env.SUPABASE_SCHEMA || 'fleetillo';
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: Missing required environment variables');
    process.exit(1);
}
const supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
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
        successful: [],
        failed: []
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
        }
        catch (error) {
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
//# sourceMappingURL=update-customers-location.js.map