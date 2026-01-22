/**
 * Route Cost Service
 * Handles cost and revenue calculations for routes
 */

import { getSupabaseClient, getAdminSupabaseClient } from './supabase';
import { createContextLogger } from '../utils/logger';
import type { Result } from '../types/index';
import { getSetting } from './settings.service';
import { SettingKeys, DEFAULT_COST_SETTINGS, CostSettings } from '../types/settings';

const logger = createContextLogger('RouteCostService');

// Constants for unit conversion
const KM_TO_MILES = 0.621371;

/**
 * Route cost breakdown
 */
export interface RouteCostBreakdown {
    fuelCost: number;
    laborCost: number;
    materialsCost: number;
    totalCost: number;
    revenue: number;
    margin: number;
    marginPercent: number;
}

/**
 * Get cost settings from database
 */
export async function getCostSettings(): Promise<CostSettings> {
    const laborRate = await getSetting<number>(SettingKeys.COSTS_LABOR_RATE_PER_HOUR);
    const gasolinePrice = await getSetting<number>(SettingKeys.COSTS_GASOLINE_PRICE_PER_GALLON);
    const dieselPrice = await getSetting<number>(SettingKeys.COSTS_DIESEL_PRICE_PER_GALLON);
    const includeBuffer = await getSetting<boolean>(SettingKeys.COSTS_INCLUDE_TRAFFIC_BUFFER);

    return {
        laborRatePerHour: laborRate.success && laborRate.data ? Number(laborRate.data) : DEFAULT_COST_SETTINGS.laborRatePerHour,
        gasolinePricePerGallon: gasolinePrice.success && gasolinePrice.data ? Number(gasolinePrice.data) : DEFAULT_COST_SETTINGS.gasolinePricePerGallon,
        dieselPricePerGallon: dieselPrice.success && dieselPrice.data ? Number(dieselPrice.data) : DEFAULT_COST_SETTINGS.dieselPricePerGallon,
        includeTrafficBuffer: includeBuffer.success && includeBuffer.data !== undefined
            ? Boolean(includeBuffer.data)
            : DEFAULT_COST_SETTINGS.includeTrafficBuffer,
    };
}

/**
 * Calculate fuel cost for a route
 * Formula: (distance_miles / fuel_efficiency_mpg) * fuel_price_per_gallon
 */
export async function calculateFuelCost(
    distanceKm: number,
    fuelEfficiencyMpg: number | null,
    fuelPricePerGallon?: number
): Promise<number> {
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
export async function calculateLaborCost(
    drivingTimeMinutes: number,
    serviceTimeMinutes: number,
    laborRatePerHour?: number
): Promise<number> {
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
export async function calculateMaterialsCost(bookingIds: string[]): Promise<number> {
    if (!bookingIds || bookingIds.length === 0) {
        return 0;
    }

    try {
        const supabase = getAdminSupabaseClient() || getSupabaseClient();

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
    } catch (error) {
        logger.error('Error calculating materials cost', error);
        return 0;
    }
}

/**
 * Calculate total revenue for a route (sum of service base prices)
 */
export async function calculateRouteRevenue(bookingIds: string[]): Promise<number> {
    if (!bookingIds || bookingIds.length === 0) {
        return 0;
    }

    try {
        const supabase = getAdminSupabaseClient() || getSupabaseClient();

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
    } catch (error) {
        logger.error('Error calculating route revenue', error);
        return 0;
    }
}

/**
 * Calculate complete cost breakdown for a route
 */
export async function calculateRouteCostBreakdown(routeId: string): Promise<Result<RouteCostBreakdown>> {
    logger.info('Calculating cost breakdown for route', { routeId });

    try {
        const supabase = getAdminSupabaseClient() || getSupabaseClient();

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
        const bookingIds = (route.stop_sequence as string[]) || [];

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

        const breakdown: RouteCostBreakdown = {
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
    } catch (error) {
        logger.error('Error calculating route cost breakdown', error);
        return { success: false, error: error as Error };
    }
}

/**
 * Update route with calculated estimated cost
 */
export async function updateRouteEstimatedCost(routeId: string): Promise<Result<number>> {
    const breakdownResult = await calculateRouteCostBreakdown(routeId);

    if (!breakdownResult.success || !breakdownResult.data) {
        return { success: false, error: breakdownResult.error };
    }

    try {
        const supabase = getAdminSupabaseClient() || getSupabaseClient();

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
    } catch (error) {
        logger.error('Error updating route estimated cost', error);
        return { success: false, error: error as Error };
    }
}
