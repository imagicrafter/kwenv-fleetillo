"use strict";
/**
 * Route Cost Service
 * Handles cost and revenue calculations for routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCostSettings = getCostSettings;
exports.calculateFuelCost = calculateFuelCost;
exports.calculateLaborCost = calculateLaborCost;
exports.calculateMaterialsCost = calculateMaterialsCost;
exports.calculateRouteRevenue = calculateRouteRevenue;
exports.calculateRouteCostBreakdown = calculateRouteCostBreakdown;
exports.updateRouteEstimatedCost = updateRouteEstimatedCost;
const supabase_1 = require("./supabase");
const logger_1 = require("../utils/logger");
const settings_service_1 = require("./settings.service");
const settings_1 = require("../types/settings");
const logger = (0, logger_1.createContextLogger)('RouteCostService');
// Constants for unit conversion
const KM_TO_MILES = 0.621371;
/**
 * Get cost settings from database
 */
async function getCostSettings() {
    const laborRate = await (0, settings_service_1.getSetting)(settings_1.SettingKeys.COSTS_LABOR_RATE_PER_HOUR);
    const gasolinePrice = await (0, settings_service_1.getSetting)(settings_1.SettingKeys.COSTS_GASOLINE_PRICE_PER_GALLON);
    const dieselPrice = await (0, settings_service_1.getSetting)(settings_1.SettingKeys.COSTS_DIESEL_PRICE_PER_GALLON);
    const includeBuffer = await (0, settings_service_1.getSetting)(settings_1.SettingKeys.COSTS_INCLUDE_TRAFFIC_BUFFER);
    return {
        laborRatePerHour: laborRate.success && laborRate.data ? Number(laborRate.data) : settings_1.DEFAULT_COST_SETTINGS.laborRatePerHour,
        gasolinePricePerGallon: gasolinePrice.success && gasolinePrice.data ? Number(gasolinePrice.data) : settings_1.DEFAULT_COST_SETTINGS.gasolinePricePerGallon,
        dieselPricePerGallon: dieselPrice.success && dieselPrice.data ? Number(dieselPrice.data) : settings_1.DEFAULT_COST_SETTINGS.dieselPricePerGallon,
        includeTrafficBuffer: includeBuffer.success && includeBuffer.data !== undefined
            ? Boolean(includeBuffer.data)
            : settings_1.DEFAULT_COST_SETTINGS.includeTrafficBuffer,
    };
}
/**
 * Calculate fuel cost for a route
 * Formula: (distance_miles / fuel_efficiency_mpg) * fuel_price_per_gallon
 */
async function calculateFuelCost(distanceKm, fuelEfficiencyMpg, fuelPricePerGallon) {
    if (!fuelEfficiencyMpg || fuelEfficiencyMpg <= 0) {
        logger.debug('No fuel efficiency data, returning 0 fuel cost');
        return 0;
    }
    const distanceMiles = distanceKm * KM_TO_MILES;
    // If no price provided, default to gasoline price
    const costSettings = await getCostSettings();
    const price = fuelPricePerGallon ?? costSettings.gasolinePricePerGallon;
    const gallonsUsed = distanceMiles / fuelEfficiencyMpg;
    const fuelCost = gallonsUsed * price;
    logger.debug('Calculated fuel cost', {
        distanceKm,
        distanceMiles,
        fuelEfficiencyMpg,
        gallonsUsed,
        fuelCost
    });
    return Math.round(fuelCost * 100) / 100; // Round to 2 decimal places
}
/**
 * Calculate labor cost for a route
 * Formula: (driving_time + service_time) / 60 * hourly_rate
 */
async function calculateLaborCost(drivingTimeMinutes, serviceTimeMinutes, laborRatePerHour) {
    const rate = laborRatePerHour ?? (await getCostSettings()).laborRatePerHour;
    const totalHours = (drivingTimeMinutes + serviceTimeMinutes) / 60;
    const laborCost = totalHours * rate;
    logger.debug('Calculated labor cost', {
        drivingTimeMinutes,
        serviceTimeMinutes,
        totalHours,
        rate,
        laborCost
    });
    return Math.round(laborCost * 100) / 100;
}
/**
 * Calculate total materials cost for a route
 */
async function calculateMaterialsCost(bookingIds) {
    if (!bookingIds || bookingIds.length === 0) {
        return 0;
    }
    try {
        const supabase = (0, supabase_1.getAdminSupabaseClient)() || (0, supabase_1.getSupabaseClient)();
        // Get bookings with their services
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('service_id, services!inner(materials_cost)')
            .in('id', bookingIds);
        if (error) {
            logger.error('Failed to fetch bookings for materials cost', error);
            return 0;
        }
        // Sum up materials costs
        let totalMaterialsCost = 0;
        for (const booking of bookings || []) {
            // @ts-expect-error - Supabase join returns nested object
            const cost = booking.services?.materials_cost;
            if (cost && typeof cost === 'number') {
                totalMaterialsCost += cost;
            }
        }
        logger.debug('Calculated materials cost', {
            bookingCount: bookings?.length,
            totalMaterialsCost
        });
        return Math.round(totalMaterialsCost * 100) / 100;
    }
    catch (error) {
        logger.error('Error calculating materials cost', error);
        return 0;
    }
}
/**
 * Calculate total revenue for a route (sum of service base prices)
 */
async function calculateRouteRevenue(bookingIds) {
    if (!bookingIds || bookingIds.length === 0) {
        return 0;
    }
    try {
        const supabase = (0, supabase_1.getAdminSupabaseClient)() || (0, supabase_1.getSupabaseClient)();
        // Get bookings with their services
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('service_id, services!inner(base_price)')
            .in('id', bookingIds);
        if (error) {
            logger.error('Failed to fetch bookings for revenue calculation', error);
            return 0;
        }
        // Sum up base prices
        let totalRevenue = 0;
        for (const booking of bookings || []) {
            // @ts-expect-error - Supabase join returns nested object
            const price = booking.services?.base_price;
            if (price && typeof price === 'number') {
                totalRevenue += price;
            }
        }
        logger.debug('Calculated route revenue', {
            bookingCount: bookings?.length,
            totalRevenue
        });
        return Math.round(totalRevenue * 100) / 100;
    }
    catch (error) {
        logger.error('Error calculating route revenue', error);
        return 0;
    }
}
/**
 * Calculate complete cost breakdown for a route
 */
async function calculateRouteCostBreakdown(routeId) {
    logger.info('Calculating cost breakdown for route', { routeId });
    try {
        const supabase = (0, supabase_1.getAdminSupabaseClient)() || (0, supabase_1.getSupabaseClient)();
        // Fetch route with vehicle data
        const { data: route, error: routeError } = await supabase
            .from('routes')
            .select(`
                id,
                total_distance_km,
                total_duration_minutes,
                stop_sequence,
                vehicle:vehicles(fuel_efficiency_mpg, fuel_type)
            `)
            .eq('id', routeId)
            .single();
        if (routeError || !route) {
            logger.error('Failed to fetch route', routeError);
            return { success: false, error: new Error(routeError?.message || 'Route not found') };
        }
        const costSettings = await getCostSettings();
        // Get vehicle's fuel efficiency and fuel type
        // @ts-expect-error - Supabase join returns nested object
        const fuelEfficiencyMpg = route.vehicle?.fuel_efficiency_mpg ?? null;
        // @ts-expect-error - Supabase join returns nested object
        const vehicleFuelType = route.vehicle?.fuel_type ?? 'gasoline';
        // Get correct fuel price based on vehicle type
        const fuelPricePerGallon = vehicleFuelType === 'diesel'
            ? costSettings.dieselPricePerGallon
            : costSettings.gasolinePricePerGallon;
        // Calculate driving time (route duration minus service time)
        const bookingIds = route.stop_sequence || [];
        // Estimate service time from bookings
        let serviceTimeMinutes = 0;
        if (bookingIds.length > 0) {
            const { data: bookings } = await supabase
                .from('bookings')
                .select('service_id, services!inner(average_duration_minutes)')
                .in('id', bookingIds);
            for (const booking of bookings || []) {
                // @ts-expect-error - Supabase join returns nested object
                const duration = booking.services?.average_duration_minutes ?? 30;
                serviceTimeMinutes += duration;
            }
        }
        const drivingTimeMinutes = Math.max(0, (route.total_duration_minutes || 0) - serviceTimeMinutes);
        // Calculate all cost components
        const [fuelCost, laborCost, materialsCost, revenue] = await Promise.all([
            calculateFuelCost(route.total_distance_km || 0, fuelEfficiencyMpg, fuelPricePerGallon),
            calculateLaborCost(drivingTimeMinutes, serviceTimeMinutes, costSettings.laborRatePerHour),
            calculateMaterialsCost(bookingIds),
            calculateRouteRevenue(bookingIds),
        ]);
        const totalCost = fuelCost + laborCost + materialsCost;
        const margin = revenue - totalCost;
        const marginPercent = revenue > 0 ? (margin / revenue) * 100 : 0;
        const breakdown = {
            fuelCost,
            laborCost,
            materialsCost,
            totalCost: Math.round(totalCost * 100) / 100,
            revenue,
            margin: Math.round(margin * 100) / 100,
            marginPercent: Math.round(marginPercent * 100) / 100,
        };
        logger.info('Route cost breakdown calculated', { routeId, breakdown });
        return { success: true, data: breakdown };
    }
    catch (error) {
        logger.error('Error calculating route cost breakdown', error);
        return { success: false, error: error };
    }
}
/**
 * Update route with calculated estimated cost
 */
async function updateRouteEstimatedCost(routeId) {
    const breakdownResult = await calculateRouteCostBreakdown(routeId);
    if (!breakdownResult.success || !breakdownResult.data) {
        return { success: false, error: breakdownResult.error };
    }
    try {
        const supabase = (0, supabase_1.getAdminSupabaseClient)() || (0, supabase_1.getSupabaseClient)();
        const { error } = await supabase
            .from('routes')
            .update({
            estimated_cost: breakdownResult.data.totalCost,
            updated_at: new Date().toISOString(),
        })
            .eq('id', routeId);
        if (error) {
            logger.error('Failed to update route estimated cost', error);
            return { success: false, error: new Error(error.message) };
        }
        logger.info('Updated route estimated cost', {
            routeId,
            estimatedCost: breakdownResult.data.totalCost
        });
        return { success: true, data: breakdownResult.data.totalCost };
    }
    catch (error) {
        logger.error('Error updating route estimated cost', error);
        return { success: false, error: error };
    }
}
//# sourceMappingURL=route-cost.service.js.map