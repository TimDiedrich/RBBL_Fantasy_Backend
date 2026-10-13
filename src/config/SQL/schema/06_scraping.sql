CREATE TABLE IF NOT EXISTS scraping_jobs (
    id SERIAL PRIMARY KEY,
	job_type VARCHAR(50) NOT NULL, -- e.g., 'FETCH_MATCH_STATS', 'FETCH_LIVE_SCORES', 'DAILY_SYNC'
	target_date DATE NOT NULL,				-- optional: specify which day's matches to scrape
	scheduled_for TIMESTAMP WITH TIME ZONE,   -- e.g., '2026-09-20 23:30:00+00'
	status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
	attempts INT DEFAULT 0,
	error_message TEXT,
	created_at TIMESTAMP DEFAULT NOW(),
	updated_at TIMESTAMP DEFAULT NOW(),

	-- Prevents duplicate jobs for the same match date
	CONSTRAINT unique_job_per_date UNIQUE (job_type, target_date)
);

-- Index to ensure fast queue polling
CREATE INDEX idx_scraping_jobs_pending ON scraping_jobs (status, scheduled_for) WHERE status = 'PENDING';