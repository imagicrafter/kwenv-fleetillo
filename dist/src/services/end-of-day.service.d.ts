import type { Result } from '../types/index.js';
/**
 * Mark all dispatched routes as completed
 * Called by the end-of-day scheduled job
 */
export declare function markDispatchedRoutesCompleted(): Promise<Result<{
    updatedCount: number;
}>>;
/**
 * Check if current time is past the configured day end time
 */
export declare function isPastDayEndTime(): Promise<boolean>;
/**
 * Run the end-of-day check
 * This is meant to be called periodically (e.g., hourly)
 * It only runs the completion if past day end time
 */
export declare function runEndOfDayCheck(): Promise<Result<{
    ran: boolean;
    updatedCount?: number;
}>>;
export declare const endOfDayService: {
    markDispatchedRoutesCompleted: typeof markDispatchedRoutesCompleted;
    isPastDayEndTime: typeof isPastDayEndTime;
    runEndOfDayCheck: typeof runEndOfDayCheck;
};
//# sourceMappingURL=end-of-day.service.d.ts.map