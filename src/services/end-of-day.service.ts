/**
 * End-of-Day Service
 * Handles automatic completion of dispatched routes at end of business day
 */
import { getSupabaseClient, getAdminSupabaseClient } from './supabase.js';
import { createContextLogger } from '../utils/logger.js';
import type { Result } from '../types/index.js';
import { getAllSettings } from './settings.service.js';

const logger = createContextLogger('EndOfDayService');

/**
 * Mark all dispatched routes as completed
 * Called by the end-of-day scheduled job
 */
export async function markDispatchedRoutesCompleted(): Promise<Result<{ updatedCount: number }>> {
    logger.info('Running end-of-day route completion');

    try {
        const supabase = getAdminSupabaseClient() || getSupabaseClient();

        // Get today's date
        const today = new Date().toISOString().split('T')[0];

        // Find all routes with status 'dispatched' for today
        const { data: routes, error: fetchError } = await supabase
            .from('routes')
            .select('id, route_code')
            .eq('status', 'dispatched')
            .eq('route_date', today);

        if (fetchError) {
            logger.error('Error fetching dispatched routes', { error: fetchError });
            return { success: false, error: new Error(fetchError.message) };
        }

        if (!routes || routes.length === 0) {
            logger.info('No dispatched routes to complete');
            return { success: true, data: { updatedCount: 0 } };
        }

        // Update all dispatched routes to completed
        const routeIds = routes.map((r: { id: string }) => r.id);

        const { error: updateError } = await supabase
            .from('routes')
            .update({
                status: 'completed',
                updated_at: new Date().toISOString()
            })
            .in('id', routeIds);

        if (updateError) {
            logger.error('Error updating routes to completed', { error: updateError });
            return { success: false, error: new Error(updateError.message) };
        }

        // Also update the bookings on these routes to completed
        const { error: bookingUpdateError } = await supabase
            .from('bookings')
            .update({
                status: 'completed',
                updated_at: new Date().toISOString()
            })
            .in('route_id', routeIds)
            .eq('status', 'scheduled');

        if (bookingUpdateError) {
            logger.warn('Error updating bookings to completed', { error: bookingUpdateError });
            // Don't fail the whole operation for booking updates
        }

        logger.info('End-of-day completion finished', {
            routeCount: routes.length,
            routeCodes: routes.map((r: { route_code?: string }) => r.route_code)
        });

        return { success: true, data: { updatedCount: routes.length } };
    } catch (error) {
        logger.error('Unexpected error in end-of-day completion', { error });
        return { success: false, error: error as Error };
    }
}

/**
 * Check if current time is past the configured day end time
 */
export async function isPastDayEndTime(): Promise<boolean> {
    try {
        const settingsResult = await getAllSettings();
        if (!settingsResult.success || !settingsResult.data) {
            // Default to 6 PM if settings not available
            const now = new Date();
            return now.getHours() >= 18;
        }

        const settings = settingsResult.data as Record<string, unknown>;
        const schedule = settings['schedule'] as { dayEndTime?: string } | undefined;
        const dayEndTime = schedule?.dayEndTime || '18:00';

        const now = new Date();
        const timeParts = dayEndTime.split(':').map(Number);
        const endHour = timeParts[0] ?? 18;
        const endMinute = timeParts[1] ?? 0;

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const endMinutes = endHour * 60 + endMinute;

        return currentMinutes >= endMinutes;
    } catch (error) {
        logger.error('Error checking day end time', { error });
        // Default to 6 PM
        const now = new Date();
        return now.getHours() >= 18;
    }
}

/**
 * Run the end-of-day check
 * This is meant to be called periodically (e.g., hourly)
 * It only runs the completion if past day end time
 */
export async function runEndOfDayCheck(): Promise<Result<{ ran: boolean; updatedCount?: number }>> {
    logger.info('Running end-of-day check');

    const isPast = await isPastDayEndTime();

    if (!isPast) {
        logger.info('Not past day end time, skipping completion');
        return { success: true, data: { ran: false } };
    }

    const result = await markDispatchedRoutesCompleted();

    if (!result.success) {
        return { success: false, error: result.error };
    }

    return { success: true, data: { ran: true, updatedCount: result.data?.updatedCount } };
}

export const endOfDayService = {
    markDispatchedRoutesCompleted,
    isPastDayEndTime,
    runEndOfDayCheck,
};
