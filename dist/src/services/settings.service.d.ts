/**
 * Settings Service
 * Handles CRUD operations for application settings
 */
import type { Result } from '../types/index.js';
import { SettingKey, RouteSettings, CostSettings } from '../types/settings.js';
/**
 * Get a single setting by key
 */
export declare function getSetting<T>(key: SettingKey): Promise<Result<T>>;
/**
 * Get all settings
 */
export declare function getAllSettings(): Promise<Result<Record<string, unknown>>>;
/**
 * Get route settings as a typed object
 */
export declare function getRouteSettings(): Promise<Result<RouteSettings>>;
/**
 * Update a single setting
 */
export declare function updateSetting(key: SettingKey, value: unknown): Promise<Result<void>>;
/**
 * Update multiple settings at once
 */
export declare function updateSettings(settings: Record<string, unknown>): Promise<Result<void>>;
/**
 * Get computed route planning parameters
 */
export declare function getRoutePlanningParams(): Promise<{
    maxDailyMinutes: number;
    avgTravelSpeedKmph: number;
    trafficBufferMultiplier: number;
    defaultServiceDuration: number;
}>;
/**
 * Get cost settings as a typed object
 */
export declare function getCostSettings(): Promise<Result<CostSettings>>;
//# sourceMappingURL=settings.service.d.ts.map