/**
 * Settings Service
 * Handles CRUD operations for application settings
 */

import { getSupabaseClient, getAdminSupabaseClient } from './supabase.js';
import { createContextLogger } from '../utils/logger.js';
import type { Result } from '../types/index.js';
import {
    SettingRow,
    SettingKey,
    SettingKeys,
    RouteSettings,
    CostSettings,
    DEFAULT_SETTINGS,
    DEFAULT_COST_SETTINGS,
    calculateMaxDailyMinutes,
} from '../types/settings.js';

const logger = createContextLogger('SettingsService');
const SETTINGS_TABLE = 'settings';

/**
 * Get a single setting by key
 */
export async function getSetting<T>(key: SettingKey): Promise<Result<T>> {
    logger.debug('Getting setting', { key });

    try {
        const supabase = getAdminSupabaseClient() || getSupabaseClient();

        const { data, error } = await supabase
            .from(SETTINGS_TABLE)
            .select('*')
            .eq('key', key)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // Not found - return default
                const defaultValue = getDefaultValue(key);
                return { success: true, data: defaultValue as T };
            }
            logger.error('Failed to get setting', error);
            return { success: false, error: new Error(error.message) };
        }

        return { success: true, data: data.value as T };
    } catch (error) {
        logger.error('Unexpected error getting setting', error);
        return { success: false, error: error as Error };
    }
}

/**
 * Get all settings
 */
export async function getAllSettings(): Promise<Result<Record<string, unknown>>> {
    logger.debug('Getting all settings');

    try {
        const supabase = getAdminSupabaseClient() || getSupabaseClient();

        const { data, error } = await supabase
            .from(SETTINGS_TABLE)
            .select('*');

        if (error) {
            logger.error('Failed to get settings', error);
            return { success: false, error: new Error(error.message) };
        }

        // Convert array to key-value object
        const settings: Record<string, unknown> = {};
        for (const row of (data as SettingRow[]) || []) {
            settings[row.key] = row.value;
        }

        return { success: true, data: settings };
    } catch (error) {
        logger.error('Unexpected error getting settings', error);
        return { success: false, error: error as Error };
    }
}

/**
 * Get route settings as a typed object
 */
export async function getRouteSettings(): Promise<Result<RouteSettings>> {
    logger.debug('Getting route settings');

    const result = await getAllSettings();
    if (!result.success) {
        return { success: false, error: result.error };
    }

    const raw = result.data ?? {};

    // Build typed settings object with defaults
    const settings: RouteSettings = {
        schedule: {
            dayStartTime: (raw[SettingKeys.SCHEDULE_DAY_START_TIME] as string) || DEFAULT_SETTINGS.schedule.dayStartTime,
            dayEndTime: (raw[SettingKeys.SCHEDULE_DAY_END_TIME] as string) || DEFAULT_SETTINGS.schedule.dayEndTime,
        },
        routing: {
            unitSystem: (raw[SettingKeys.ROUTING_UNIT_SYSTEM] as 'imperial' | 'metric') || DEFAULT_SETTINGS.routing.unitSystem,
            avgTravelSpeed: (raw[SettingKeys.ROUTING_AVG_TRAVEL_SPEED] as number) || DEFAULT_SETTINGS.routing.avgTravelSpeed,
            trafficBufferPercent: (raw[SettingKeys.ROUTING_TRAFFIC_BUFFER_PERCENT] as number) || DEFAULT_SETTINGS.routing.trafficBufferPercent,
            defaultServiceDurationMinutes: (raw[SettingKeys.ROUTING_DEFAULT_SERVICE_DURATION] as number) || DEFAULT_SETTINGS.routing.defaultServiceDurationMinutes,
        },
    };

    return { success: true, data: settings };
}

/**
 * Update a single setting
 */
export async function updateSetting(key: SettingKey, value: unknown): Promise<Result<void>> {
    logger.debug('Updating setting', { key });

    try {
        const supabase = getAdminSupabaseClient() || getSupabaseClient();

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
    } catch (error) {
        logger.error('Unexpected error updating setting', error);
        return { success: false, error: error as Error };
    }
}

/**
 * Update multiple settings at once
 */
export async function updateSettings(settings: Record<string, unknown>): Promise<Result<void>> {
    logger.debug('Updating multiple settings', { count: Object.keys(settings).length });

    try {
        const supabase = getAdminSupabaseClient() || getSupabaseClient();

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
    } catch (error) {
        logger.error('Unexpected error updating settings', error);
        return { success: false, error: error as Error };
    }
}

/**
 * Get computed route planning parameters
 */
export async function getRoutePlanningParams(): Promise<{
    maxDailyMinutes: number;
    avgTravelSpeedKmph: number;
    trafficBufferMultiplier: number;
    defaultServiceDuration: number;
}> {
    const result = await getRouteSettings();
    const settings = result.success && result.data ? result.data : DEFAULT_SETTINGS;

    return {
        maxDailyMinutes: calculateMaxDailyMinutes(
            settings.schedule.dayStartTime,
            settings.schedule.dayEndTime
        ),
        avgTravelSpeedKmph: settings.routing.avgTravelSpeed,
        trafficBufferMultiplier: 1 + (settings.routing.trafficBufferPercent / 100),
        defaultServiceDuration: settings.routing.defaultServiceDurationMinutes,
    };
}

/**
 * Get cost settings as a typed object
 */
export async function getCostSettings(): Promise<Result<CostSettings>> {
    logger.debug('Getting cost settings');

    const result = await getAllSettings();
    if (!result.success) {
        return { success: false, error: result.error };
    }

    const raw = result.data ?? {};

    const settings: CostSettings = {
        laborRatePerHour: Number(raw[SettingKeys.COSTS_LABOR_RATE_PER_HOUR]) || DEFAULT_COST_SETTINGS.laborRatePerHour,
        gasolinePricePerGallon: Number(raw[SettingKeys.COSTS_GASOLINE_PRICE_PER_GALLON]) || DEFAULT_COST_SETTINGS.gasolinePricePerGallon,
        dieselPricePerGallon: Number(raw[SettingKeys.COSTS_DIESEL_PRICE_PER_GALLON]) || DEFAULT_COST_SETTINGS.dieselPricePerGallon,
        includeTrafficBuffer: raw[SettingKeys.COSTS_INCLUDE_TRAFFIC_BUFFER] !== undefined
            ? Boolean(raw[SettingKeys.COSTS_INCLUDE_TRAFFIC_BUFFER])
            : DEFAULT_COST_SETTINGS.includeTrafficBuffer,
    };

    return { success: true, data: settings };
}

/**
 * Get default value for a setting key
 */
function getDefaultValue(key: SettingKey): unknown {
    switch (key) {
        case SettingKeys.SCHEDULE_DAY_START_TIME:
            return DEFAULT_SETTINGS.schedule.dayStartTime;
        case SettingKeys.SCHEDULE_DAY_END_TIME:
            return DEFAULT_SETTINGS.schedule.dayEndTime;
        case SettingKeys.ROUTING_UNIT_SYSTEM:
            return DEFAULT_SETTINGS.routing.unitSystem;
        case SettingKeys.ROUTING_AVG_TRAVEL_SPEED:
            return DEFAULT_SETTINGS.routing.avgTravelSpeed;
        case SettingKeys.ROUTING_TRAFFIC_BUFFER_PERCENT:
            return DEFAULT_SETTINGS.routing.trafficBufferPercent;
        case SettingKeys.ROUTING_DEFAULT_SERVICE_DURATION:
            return DEFAULT_SETTINGS.routing.defaultServiceDurationMinutes;
        case SettingKeys.COSTS_LABOR_RATE_PER_HOUR:
            return DEFAULT_COST_SETTINGS.laborRatePerHour;
        case SettingKeys.COSTS_GASOLINE_PRICE_PER_GALLON:
            return DEFAULT_COST_SETTINGS.gasolinePricePerGallon;
        case SettingKeys.COSTS_DIESEL_PRICE_PER_GALLON:
            return DEFAULT_COST_SETTINGS.dieselPricePerGallon;
        case SettingKeys.COSTS_INCLUDE_TRAFFIC_BUFFER:
            return DEFAULT_COST_SETTINGS.includeTrafficBuffer;
        default:
            return null;
    }
}

