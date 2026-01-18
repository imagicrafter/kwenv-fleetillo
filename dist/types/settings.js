"use strict";
/**
 * Settings Types
 * Defines types for application settings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COST_SETTINGS = exports.DEFAULT_SETTINGS = exports.SettingKeys = void 0;
exports.calculateMaxDailyMinutes = calculateMaxDailyMinutes;
exports.convertSpeed = convertSpeed;
// Setting keys as constants for type safety
exports.SettingKeys = {
    SCHEDULE_DAY_START_TIME: 'schedule.dayStartTime',
    SCHEDULE_DAY_END_TIME: 'schedule.dayEndTime',
    ROUTING_UNIT_SYSTEM: 'routing.unitSystem',
    ROUTING_AVG_TRAVEL_SPEED: 'routing.avgTravelSpeed',
    ROUTING_TRAFFIC_BUFFER_PERCENT: 'routing.trafficBufferPercent',
    ROUTING_DEFAULT_SERVICE_DURATION: 'routing.defaultServiceDurationMinutes',
    // Cost settings
    COSTS_LABOR_RATE_PER_HOUR: 'costs.laborRatePerHour',
    COSTS_GASOLINE_PRICE_PER_GALLON: 'costs.gasolinePricePerGallon',
    COSTS_DIESEL_PRICE_PER_GALLON: 'costs.dieselPricePerGallon',
    COSTS_INCLUDE_TRAFFIC_BUFFER: 'costs.includeTrafficBuffer',
    // Dashboard settings
    DASHBOARD_SHOW_CHATBOT: 'dashboard.showChatbot',
};
// Default settings
exports.DEFAULT_SETTINGS = {
    schedule: {
        dayStartTime: '08:00',
        dayEndTime: '17:00',
    },
    routing: {
        unitSystem: 'imperial',
        avgTravelSpeed: 30, // km/h
        trafficBufferPercent: 20,
        defaultServiceDurationMinutes: 30,
    },
    dashboard: {
        showChatbot: true,
    },
};
// Default cost settings
exports.DEFAULT_COST_SETTINGS = {
    laborRatePerHour: 50,
    gasolinePricePerGallon: 3.50,
    dieselPricePerGallon: 3.80,
    includeTrafficBuffer: true,
};
// Utility: Calculate max daily minutes from schedule
function calculateMaxDailyMinutes(startTime, endTime) {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = (startHour ?? 0) * 60 + (startMin ?? 0);
    const endMinutes = (endHour ?? 0) * 60 + (endMin ?? 0);
    return Math.max(0, endMinutes - startMinutes);
}
// Utility: Convert speed between units
function convertSpeed(speed, fromUnit, toUnit) {
    if (fromUnit === toUnit)
        return speed;
    if (fromUnit === 'metric' && toUnit === 'imperial') {
        return speed * 0.621371; // km/h to mph
    }
    return speed * 1.60934; // mph to km/h
}
//# sourceMappingURL=settings.js.map