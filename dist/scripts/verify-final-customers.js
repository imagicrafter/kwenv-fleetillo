"use strict";
/**
 * Script to verify the final customer data
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
async function verifyCustomers() {
    const { data, error } = await supabase
        .from('customers')
        .select('name, phone, city, state, tags')
        .contains('tags', ['LL'])
        .order('name', { ascending: true });
    if (error) {
        console.error('Error fetching customers:', error);
        process.exit(1);
    }
    console.log(`\nCustomers with 'LL' tag (${data.length} total):\n`);
    console.log('Name'.padEnd(25), 'Phone'.padEnd(20), 'Location'.padEnd(25), 'Tags');
    console.log('='.repeat(95));
    data.forEach((customer) => {
        const name = customer.name.padEnd(25);
        const phone = (customer.phone || 'N/A').padEnd(20);
        const location = `${customer.city || 'N/A'}, ${customer.state || 'N/A'}`.padEnd(25);
        const tags = customer.tags ? customer.tags.join(', ') : 'N/A';
        console.log(`${name} ${phone} ${location} ${tags}`);
    });
}
verifyCustomers().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
//# sourceMappingURL=verify-final-customers.js.map