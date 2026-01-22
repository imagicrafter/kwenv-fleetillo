/**
 * Dispatch Scheduler Job
 * This script is run by DigitalOcean App Platform on a cron schedule
 * to execute pending dispatch jobs that are due
 */
import { dispatchJobService } from '../services/dispatch-job.service';
import { createContextLogger } from '../utils/logger';

const logger = createContextLogger('DispatchSchedulerJob');

async function main() {
    logger.info('=== Dispatch Scheduler Job Started ===');
    const startTime = Date.now();

    try {
        // Get all pending jobs that are due for execution
        const pendingResult = await dispatchJobService.getPendingJobsDue();

        if (!pendingResult.success || !pendingResult.data) {
            logger.error('Failed to fetch pending jobs', { error: pendingResult.error });
            process.exit(1);
        }

        const pendingJobs = pendingResult.data;
        logger.info(`Found ${pendingJobs.length} pending job(s) to execute`);

        if (pendingJobs.length === 0) {
            logger.info('No jobs to process');
            process.exit(0);
        }

        // Execute each pending job
        let successCount = 0;
        let failCount = 0;

        for (const job of pendingJobs) {
            logger.info(`Executing job: ${job.name} (${job.id})`);

            const result = await dispatchJobService.executeDispatchJob(job.id);

            if (result.success && result.data) {
                successCount++;
                logger.info(`Job completed: ${job.name}`, {
                    dispatchedCount: result.data.dispatchedCount,
                    failedCount: result.data.failedCount
                });
            } else {
                failCount++;
                logger.error(`Job failed: ${job.name}`, { error: result.error });
            }
        }

        const duration = Date.now() - startTime;
        logger.info('=== Dispatch Scheduler Job Completed ===', {
            totalJobs: pendingJobs.length,
            successCount,
            failCount,
            durationMs: duration
        });

        process.exit(failCount > 0 ? 1 : 0);
    } catch (error) {
        logger.error('Unexpected error in dispatch scheduler', { error });
        process.exit(1);
    }
}

main();
