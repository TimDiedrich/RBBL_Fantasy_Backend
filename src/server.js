const { server } = require('./app');
const { startCronJobs, syncStatsJobsFromFixtures } = require('./jobs/scheduler');

const PORT = process.env.PORT || 3000;


server.listen(PORT, '0.0.0.0', () => {
    console.log(`Home Network Server running on http://0.0.0.0:${PORT}`);

    // Prevent cron jobs from starting during tests
    if (process.env.NODE_ENV !== 'test') {
        startCronJobs();
    }
});
