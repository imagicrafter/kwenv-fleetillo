/**
 * Route Cost Service
 * Handles cost and revenue calculations for routes
 */
import type { Result } from '../types/index';
import { CostSettings } from '../types/settings';
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
export declare function getCostSettings(): Promise<CostSettings>;
/**
 * Calculate fuel cost for a route
 * Formula: (distance_miles / fuel_efficiency_mpg) * fuel_price_per_gallon
 */
export declare function calculateFuelCost(distanceKm: number, fuelEfficiencyMpg: number | null, fuelPricePerGallon?: number): Promise<number>;
/**
 * Calculate labor cost for a route
 * Formula: (driving_time + service_time) / 60 * hourly_rate
 */
export declare function calculateLaborCost(drivingTimeMinutes: number, serviceTimeMinutes: number, laborRatePerHour?: number): Promise<number>;
/**
 * Calculate total materials cost for a route
 */
export declare function calculateMaterialsCost(bookingIds: string[]): Promise<number>;
/**
 * Calculate total revenue for a route (sum of service base prices)
 */
export declare function calculateRouteRevenue(bookingIds: string[]): Promise<number>;
/**
 * Calculate complete cost breakdown for a route
 */
export declare function calculateRouteCostBreakdown(routeId: string): Promise<Result<RouteCostBreakdown>>;
/**
 * Update route with calculated estimated cost
 */
export declare function updateRouteEstimatedCost(routeId: string): Promise<Result<number>>;
//# sourceMappingURL=route-cost.service.d.ts.map