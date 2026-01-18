/**
 * Settings Types
 * Defines types for application settings
 */
export declare const SettingKeys: {
    readonly SCHEDULE_DAY_START_TIME: "schedule.dayStartTime";
    readonly SCHEDULE_DAY_END_TIME: "schedule.dayEndTime";
    readonly ROUTING_UNIT_SYSTEM: "routing.unitSystem";
    readonly ROUTING_AVG_TRAVEL_SPEED: "routing.avgTravelSpeed";
    readonly ROUTING_TRAFFIC_BUFFER_PERCENT: "routing.trafficBufferPercent";
    readonly ROUTING_DEFAULT_SERVICE_DURATION: "routing.defaultServiceDurationMinutes";
    readonly COSTS_LABOR_RATE_PER_HOUR: "costs.laborRatePerHour";
    readonly COSTS_GASOLINE_PRICE_PER_GALLON: "costs.gasolinePricePerGallon";
    readonly COSTS_DIESEL_PRICE_PER_GALLON: "costs.dieselPricePerGallon";
    readonly COSTS_INCLUDE_TRAFFIC_BUFFER: "costs.includeTrafficBuffer";
    readonly DASHBOARD_SHOW_CHATBOT: "dashboard.showChatbot";
};
export type SettingKey = (typeof SettingKeys)[keyof typeof SettingKeys];
export type UnitSystem = 'imperial' | 'metric';
export interface SettingRow {
    key: string;
    value: unknown;
    description?: string;
    created_at: string;
    updated_at: string;
}
export interface Setting<T = unknown> {
    key: string;
    value: T;
    description?: string;
    updatedAt: string;
}
export interface RouteSettings {
    schedule: {
        dayStartTime: string;
        dayEndTime: string;
    };
    routing: {
        unitSystem: UnitSystem;
        avgTravelSpeed: number;
        trafficBufferPercent: number;
        defaultServiceDurationMinutes: number;
    };
    dashboard: {
        showChatbot: boolean;
    };
}
export interface CostSettings {
    laborRatePerHour: number;
    gasolinePricePerGallon: number;
    dieselPricePerGallon: number;
    includeTrafficBuffer: boolean;
}
export declare const DEFAULT_SETTINGS: RouteSettings;
export declare const DEFAULT_COST_SETTINGS: CostSettings;
export declare function calculateMaxDailyMinutes(startTime: string, endTime: string): number;
export declare function convertSpeed(speed: number, fromUnit: UnitSystem, toUnit: UnitSystem): number;
//# sourceMappingURL=settings.d.ts.map