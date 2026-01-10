/**
 * Settings Types
 * Defines types for application settings
 */

// Setting keys as constants for type safety
export const SettingKeys = {
    SCHEDULE_DAY_START_TIME: 'schedule.dayStartTime',
    SCHEDULE_DAY_END_TIME: 'schedule.dayEndTime',
    ROUTING_UNIT_SYSTEM: 'routing.unitSystem',
    ROUTING_AVG_TRAVEL_SPEED: 'routing.avgTravelSpeed',
    ROUTING_TRAFFIC_BUFFER_PERCENT: 'routing.trafficBufferPercent',
    ROUTING_DEFAULT_SERVICE_DURATION: 'routing.defaultServiceDurationMinutes',
} as const;

export type SettingKey = (typeof SettingKeys)[keyof typeof SettingKeys];

// Unit system type
export type UnitSystem = 'imperial' | 'metric';

// Setting row from database
export interface SettingRow {
    key: string;
    value: unknown; // JSONB can be any type
    description?: string;
    created_at: string;
    updated_at: string;
}

// Typed setting value
export interface Setting<T = unknown> {
    key: string;
    value: T;
    description?: string;
    updatedAt: string;
}

// All settings grouped
export interface RouteSettings {
    schedule: {
        dayStartTime: string;  // HH:MM format
        dayEndTime: string;    // HH:MM format
    };
    routing: {
        unitSystem: UnitSystem;
        avgTravelSpeed: number;        // Always stored in km/h
        trafficBufferPercent: number;  // 0-100
        defaultServiceDurationMinutes: number;
    };
}

// Default settings
export const DEFAULT_SETTINGS: RouteSettings = {
    schedule: {
        dayStartTime: '08:00',
        dayEndTime: '17:00',
    },
    routing: {
        unitSystem: 'imperial',
        avgTravelSpeed: 30,  // km/h
        trafficBufferPercent: 20,
        defaultServiceDurationMinutes: 30,
    },
};

// Utility: Calculate max daily minutes from schedule
export function calculateMaxDailyMinutes(startTime: string, endTime: string): number {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = (startHour ?? 0) * 60 + (startMin ?? 0);
    const endMinutes = (endHour ?? 0) * 60 + (endMin ?? 0);

    return Math.max(0, endMinutes - startMinutes);
}

// Utility: Convert speed between units
export function convertSpeed(speed: number, fromUnit: UnitSystem, toUnit: UnitSystem): number {
    if (fromUnit === toUnit) return speed;
    if (fromUnit === 'metric' && toUnit === 'imperial') {
        return speed * 0.621371; // km/h to mph
    }
    return speed * 1.60934; // mph to km/h
}
