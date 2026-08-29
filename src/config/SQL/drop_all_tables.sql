

DROP TYPE IF EXISTS match_status;
-- Reverse order deletion:
-- Pro Tip: Alternatively, you can run DROP TABLE IF EXISTS users CASCADE;
-- and PostgreSQL will automatically wipe all child foreign keys attached to users, regardless of order.
-- 1. Views must be dropped before the tables they query
DROP VIEW IF EXISTS league_standings;

-- 2. Leaf tables (Tables with foreign keys pointing to fantasy_teams, real_games, or players)
DROP TABLE IF EXISTS draft_picks;
DROP TABLE IF EXISTS rosters;
DROP TABLE IF EXISTS weekly_lineups;
DROP TABLE IF EXISTS player_game_stats;
DROP TABLE IF EXISTS matchups;

-- 3. Mid-level tables (Depend on fantasy_leagues, users, or global teams/players)
DROP TABLE IF EXISTS fantasy_teams;
DROP TABLE IF EXISTS fantasy_players;
DROP TABLE IF EXISTS game_weeks;
DROP TABLE IF EXISTS real_games;

-- 4. High-level tables (Depend on users or teams)
DROP TABLE IF EXISTS league_members;
DROP TABLE IF EXISTS league_settings;
DROP TABLE IF EXISTS fantasy_leagues;
DROP TABLE IF EXISTS players;

-- 5. Root base tables (Have no foreign keys pointing to other custom tables)
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS teams;