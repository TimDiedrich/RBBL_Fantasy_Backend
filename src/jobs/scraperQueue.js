const db = require('../config/db');

async function queueGlobalMatchScrape(targetDate = null) {
    const existingJob = await db.query(
        `SELECT id FROM scraping_jobs
         WHERE status = 'PENDING
             AND job_type = 'FETCH_MATCH_RESULTS'`
    );

    if(existingJob.rows.length > 0) {
        console.log('[JOB QUEUE] Pending scrape job already exists. Skipping insertion.');
        return;
    }

    await db.query(
        `INSERT INTO scraping_jobs (job_type, target_date)
        VALUES ($1, $2)`,
        ['FETCH_MATCH_RESULTS', targetDate || new Date().toISOString().split('T')[0]]
    );

    console.log('[JOB QUEUE] Global match scrape job queued.');
}