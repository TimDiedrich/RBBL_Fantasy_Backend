const cron = require('node-cron');
const db = require('../config/db');


async function syncStatsJobsFromFixtures() {
    console.log('[Scheduler] Syncing FETCH_MATCH_STATS jobs from real_games...');
    
    await db.query(`
        INSERT INTO scraping_jobs (job_type, target_date, scheduled_for, status)
        SELECT 
            'FETCH_MATCH_STATS' AS job_type,
            game_date::DATE AS target_date,
            MAX(game_date) + INTERVAL '3 hours' AS scheduled_for,
            'PENDING' AS status
        FROM real_games
        WHERE game_date >= CURRENT_DATE
        GROUP BY game_date::DATE
        ON CONFLICT (job_type, target_date)
        DO UPDATE SET
            scheduled_for = EXCLUDED.scheduled_for,
            status = CASE 
                WHEN scraping_jobs.status = 'CANCELLED' THEN 'PENDING'
                ELSE scraping_jobs.status
            END,
            updated_at = NOW()
        WHERE scraping_jobs.status IN ('PENDING', 'CANCELLED');
    `);

    // Clean up or cancel pending jobs for dates that no longer have games
    await db.query(`
        UPDATE scraping_jobs
        SET status = 'CANCELLED', updated_at = NOW()
        WHERE job_type = 'FETCH_MATCH_STATS'
          AND status = 'PENDING'
          AND target_date >= CURRENT_DATE
          AND target_date NOT IN (
              SELECT DISTINCT game_date::DATE 
              FROM real_games
          );
    `);
}

async function queueScheduleCheckJob() {
    console.log('[Scheduler] Queueing CHECK_MATCH_SCHEDULE job...');

    await db.query(`
        INSERT INTO scraping_jobs (job_type, target_date, scheduled_for, status)
        VALUES ('CHECK_MATCH_SCHEDULE', CURRENT_DATE, NOW(), 'PENDING')
        ON CONFLICT (job_type, target_date) DO UPDATE 
        SET status = 'PENDING', scheduled_for = NOW(), updated_at = NOW()
        WHERE scraping_jobs.status IN ('COMPLETED', 'FAILED', 'CANCELLED');
    `);
}



function startCronJobs() {
    // Cron syntax: 'Minute Hour * * *' = At minute 0 past every hour
    // 3:00 am every day
    cron.schedule('0 3 * * *', async () => {
    //cron.schedule('* * * * *', async () => { // Updates by minute
        console.log('[SCHEDULER] Running daily master cron pipeline...');

        try {
            await queueScheduleCheckJob();
            await syncStatsJobsFromFixtures();
            
            console.log('[Scheduler] Daily master cron pipeline completed successfully.');
        } catch (error) {
            console.error('[Scheduler] Error running daily cron queue job:', error);
        }
    });
}

module.exports = { startCronJobs, syncStatsJobsFromFixtures };