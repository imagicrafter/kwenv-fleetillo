"use strict";
/**
 * Settings Service
 * Handles CRUD operations for application settings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSetting = getSetting;
exports.getAllSettings = getAllSettings;
exports.getRouteSettings = getRouteSettings;
exports.updateSetting = updateSetting;
exports.updateSettings = updateSettings;
exports.getRoutePlanningParams = getRoutePlanningParams;
exports.getCostSettings = getCostSettings;
const supabase_1 = require("./supabase");
const logger_1 = require("../utils/logger");
const settings_1 = require("../types/settings");
const logger = (0, logger_1.createContextLogger)('SettingsService');
const SETTINGS_TABLE = 'settings';
/**
 * Get a single setting by key
 */
async function getSetting(key) {
    logger.debug('Getting setting', { key });
    try {
        const supabase = (0, supabase_1.getAdminSupabaseClient)() || (0, supabase_1.getSupabaseClient)();
        const { data, error } = await supabase
            .from(SETTINGS_TABLE)
            .select('*')
            .eq('key', key)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                // Not found - return default
                const defaultValue = getDefaultValue(key);
                return { success: true, data: defaultValue };
            }
            logger.error('Failed to get setting', error);
            return { success: false, error: new Error(error.message) };
        }
        return { success: true, data: data.value };
    }
    catch (error) {
        logger.error('Unexpected error getting setting', error);
        return { success: false, error: error };
    }
}
/**
 * Get all settings
 */
async function getAllSettings() {
    logger.debug('Getting all settings');
    try {
        const supabase = (0, supabase_1.getAdminSupabaseClient)() || (0, supabase_1.getSupabaseClient)();
        const { data, error } = await supabase
            .from(SETTINGS_TABLE)
            .select('*');
        if (error) {
            logger.error('Failed to get settings', error);
            return { success: false, error: new Error(error.message) };
        }
        // Convert array to key-value object
        const settings = {};
        for (const row of data || []) {
            settings[row.key] = row.value;
        }
        return { success: true, data: settings };
    }
    catch (error) {
        logger.error('Unexpected error getting settings', error);
        return { success: false, error: error };
    }
}
/**
 * Get route settings as a typed object
 */
async function getRouteSettings() {
    logger.debug('Getting route settings');
    const result = await getAllSettings();
    if (!result.success) {
        return { success: false, error: result.error };
    }
    const raw = result.data ?? {};
    // Build typed settings object with defaults
    const settings = {
        schedule: {
            dayStartTime: raw[settings_1.SettingKeys.SCHEDULE_DAY_START_TIME] || settings_1.DEFAULT_SETTINGS.schedule.dayStartTime,
            dayEndTime: raw[settings_1.SettingKeys.SCHEDULE_DAY_END_TIME] || settings_1.DEFAULT_SETTINGS.schedule.dayEndTime,
        },
        routing: {
            unitSystem: raw[settings_1.SettingKeys.ROUTING_UNIT_SYSTEM] || settings_1.DEFAULT_SETTINGS.routing.unitSystem,
            avgTravelSpeed: raw[settings_1.SettingKeys.ROUTING_AVG_TRAVEL_SPEED] || settings_1.DEFAULT_SETTINGS.routing.avgTravelSpeed,
            trafficBufferPercent: raw[settings_1.SettingKeys.ROUTING_TRAFFIC_BUFFER_PERCENT] || settings_1.DEFAULT_SETTINGS.routing.trafficBufferPercent,
            defaultServiceDurationMinutes: raw[settings_1.SettingKeys.ROUTING_DEFAULT_SERVICE_DURATION] || settings_1.DEFAULT_SETTINGS.routing.defaultServiceDurationMinutes,
        },
        dashboard: {
            showChatbot: raw[settings_1.SettingKeys.DASHBOARD_SHOW_CHATBOT] !== undefined
                ? Boolean(raw[settings_1.SettingKeys.DASHBOARD_SHOW_CHATBOT])
                : settings_1.DEFAULT_SETTINGS.dashboard.showChatbot,
        },
    };
    return { success: true, data: settings };
}
/**
 * Update a single setting
 */
async function updateSetting(key, value) {
    logger.debug('Updating setting', { key });
    try {
        const supabase = (0, supabase_1.getAdminSupabaseClient)() || (0, supabase_1.getSupabaseClient)();
        const { error } = await supabase
            .from(SETTINGS_TABLE)
            .upsert({
            key,
            value,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });
        if (error) {
            logger.error('Failed to update setting', error);
            return { success: false, error: new Error(error.message) };
        }
        logger.info('Setting updated', { key });
        return { success: true };
    }
    catch (error) {
        logger.error('Unexpected error updating setting', error);
        return { success: false, error: error };
    }
}
/**
 * Update multiple settings at once
 */
async function updateSettings(settings) {
    logger.debug('Updating multiple settings', { count: Object.keys(settings).length });
    try {
        const supabase = (0, supabase_1.getAdminSupabaseClient)() || (0, supabase_1.getSupabaseClient)();
        const rows = Object.entries(settings).map(([key, value]) => ({
            key,
            value,
            updated_at: new Date().toISOString(),
        }));
        const { error } = await supabase
            .from(SETTINGS_TABLE)
            .upsert(rows, { onConflict: 'key' });
        if (error) {
            logger.error('Failed to update settings', error);
            return { success: false, error: new Error(error.message) };
        }
        logger.info('Settings updated', { count: rows.length });
        return { success: true };
    }
    catch (error) {
        logger.error('Unexpected error updating settings', error);
        return { success: false, error: error };
    }
}
/**
 * Get computed route planning parameters
 */
async function getRoutePlanningParams() {
    const result = await getRouteSettings();
    const settings = result.success && result.data ? result.data : settings_1.DEFAULT_SETTINGS;
    return {
        maxDailyMinutes: (0, settings_1.calculateMaxDailyMinutes)(settings.schedule.dayStartTime, settings.schedule.dayEndTime),
        avgTravelSpeedKmph: settings.routing.avgTravelSpeed,
        trafficBufferMultiplier: 1 + (settings.routing.trafficBufferPercent / 100),
        defaultServiceDuration: settings.routing.defaultServiceDurationMinutes,
    };
}
/**
 * Get cost settings as a typed object
 */
async function getCostSettings() {
    logger.debug('Getting cost settings');
    const result = await getAllSettings();
    if (!result.success) {
        return { success: false, error: result.error };
    }
    const raw = result.data ?? {};
    const settings = {
        laborRatePerHour: Number(raw[settings_1.SettingKeys.COSTS_LABOR_RATE_PER_HOUR]) || settings_1.DEFAULT_COST_SETTINGS.laborRatePerHour,
        gasolinePricePerGallon: Number(raw[settings_1.SettingKeys.COSTS_GASOLINE_PRICE_PER_GALLON]) || settings_1.DEFAULT_COST_SETTINGS.gasolinePricePerGallon,
        dieselPricePerGallon: Number(raw[settings_1.SettingKeys.COSTS_DIESEL_PRICE_PER_GALLON]) || settings_1.DEFAULT_COST_SETTINGS.dieselPricePerGallon,
        includeTrafficBuffer: raw[settings_1.SettingKeys.COSTS_INCLUDE_TRAFFIC_BUFFER] !== undefined
            ? Boolean(raw[settings_1.SettingKeys.COSTS_INCLUDE_TRAFFIC_BUFFER])
            : settings_1.DEFAULT_COST_SETTINGS.includeTrafficBuffer,
    };
    return { success: true, data: settings };
}
/**
 * Get default value for a setting key
 */
function getDefaultValue(key) {
    switch (key) {
        case settings_1.SettingKeys.SCHEDULE_DAY_START_TIME:
            return settings_1.DEFAULT_SETTINGS.schedule.dayStartTime;
        case settings_1.SettingKeys.SCHEDULE_DAY_END_TIME:
            return settings_1.DEFAULT_SETTINGS.schedule.dayEndTime;
        case settings_1.SettingKeys.ROUTING_UNIT_SYSTEM:
            return settings_1.DEFAULT_SETTINGS.routing.unitSystem;
        case settings_1.SettingKeys.ROUTING_AVG_TRAVEL_SPEED:
            return settings_1.DEFAULT_SETTINGS.routing.avgTravelSpeed;
        case settings_1.SettingKeys.ROUTING_TRAFFIC_BUFFER_PERCENT:
            return settings_1.DEFAULT_SETTINGS.routing.trafficBufferPercent;
        case settings_1.SettingKeys.ROUTING_DEFAULT_SERVICE_DURATION:
            return settings_1.DEFAULT_SETTINGS.routing.defaultServiceDurationMinutes;
        case settings_1.SettingKeys.COSTS_LABOR_RATE_PER_HOUR:
            return settings_1.DEFAULT_COST_SETTINGS.laborRatePerHour;
        case settings_1.SettingKeys.COSTS_GASOLINE_PRICE_PER_GALLON:
            return settings_1.DEFAULT_COST_SETTINGS.gasolinePricePerGallon;
        case settings_1.SettingKeys.COSTS_DIESEL_PRICE_PER_GALLON:
            return settings_1.DEFAULT_COST_SETTINGS.dieselPricePerGallon;
        case settings_1.SettingKeys.COSTS_INCLUDE_TRAFFIC_BUFFER:
            return settings_1.DEFAULT_COST_SETTINGS.includeTrafficBuffer;
        case settings_1.SettingKeys.DASHBOARD_SHOW_CHATBOT:
            return settings_1.DEFAULT_SETTINGS.dashboard.showChatbot;
        default:
            return null;
    }
}
//# sourceMappingURL=settings.service.js.map