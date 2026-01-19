"use strict";
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
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
    db: { schema: 'optiroute' }
});
async function verifySchema() {
    console.log('Verifying schema changes...\n');
    // Query the information schema to check columns
    const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'optiroute')
        .eq('table_name', 'bookings')
        .in('column_name', ['service_id', 'service_ids', 'service_items'])
        .order('column_name');
    if (error) {
        console.error('Error querying schema:', error);
        // Try an alternative method - attempt to query a booking with the new columns
        console.log('\nTrying alternative verification method...');
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('id, service_id, service_ids, service_items')
            .limit(1)
            .single();
        if (bookingError) {
            console.error('Error:', bookingError.message);
            if (bookingError.message.includes('service_ids')) {
                console.error('❌ Migration may not have been applied correctly - service_ids column not found');
            }
            else {
                console.log('✅ Columns exist! Error:', bookingError.message);
            }
        }
        else {
            console.log('✅ Successfully queried new columns!');
            console.log('Sample booking:', JSON.stringify(booking, null, 2));
        }
    }
    else {
        console.log('Schema query results:');
        console.table(data);
        console.log('\n✅ Schema verification complete!');
    }
}
verifySchema().catch(console.error);
//# sourceMappingURL=verify-multi-service-schema.js.map