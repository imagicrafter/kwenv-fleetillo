"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const path_1 = __importDefault(require("path"));
// Load env vars from root immediately
(0, dotenv_1.config)({ path: path_1.default.resolve(process.cwd(), '.env') });
async function run() {
    console.log('Checking Route Settings...');
    // Import services dynamically after env is set
    const { initializeSupabase } = await import('../services/supabase.js');
    const { getRouteSettings } = await import('../services/settings.service.js');
    // Initialize Supabase
    const initResult = initializeSupabase();
    if (!initResult.success) {
        console.error('Failed to initialize Supabase:', initResult.error);
        return;
    }
    const settingsResult = await getRouteSettings();
    if (settingsResult.success) {
        console.log('Settings retrieved successfully.');
        console.log('Full Settings Data:', JSON.stringify(settingsResult.data, null, 2));
        if (settingsResult.data && settingsResult.data.schedule) {
            console.log('Schedule Settings:', settingsResult.data.schedule);
            console.log('Day Start Time:', settingsResult.data.schedule.dayStartTime);
        }
        else {
            console.log('Schedule settings missing.');
        }
    }
    else {
        console.error('Failed to retrieve settings:', settingsResult.error);
    }
    process.exit(0);
}
run();
//# sourceMappingURL=check_settings.js.map