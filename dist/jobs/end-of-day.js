"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * End-of-Day Job
 * This script is run by DigitalOcean App Platform on a cron schedule
 * to mark dispatched routes as completed at end of business day
 */
const end_of_day_service_1 = require("../services/end-of-day.service");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createContextLogger)('EndOfDayJob');
async function main() {
    logger.info('=== End-of-Day Job Started ===');
    const startTime = Date.now();
    try {
        const result = await end_of_day_service_1.endOfDayService.runEndOfDayCheck();
        if (!result.success) {
            logger.error('End-of-day check failed', { error: result.error });
            process.exit(1);
        }
        const duration = Date.now() - startTime;
        if (result.data?.ran) {
            logger.info('=== End-of-Day Job Completed ===', {
                updatedRoutes: result.data.updatedCount,
                durationMs: duration
            });
        }
        else {
            logger.info('=== End-of-Day Job Skipped (not past end time) ===', {
                durationMs: duration
            });
        }
        process.exit(0);
    }
    catch (error) {
        logger.error('Unexpected error in end-of-day job', { error });
        process.exit(1);
    }
}
main();
//# sourceMappingURL=end-of-day.js.map