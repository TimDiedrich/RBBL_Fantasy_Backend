SET client_encoding = 'UTF8';
SET client_min_messages = warning;
BEGIN;

-- 0. CLEANUP FIRST
\echo 'Wiping old schema...'
\i SQL/reset.sql

-- 1. SCHEMA MIGRATIONS (Structure)
\echo 'Creating Types...'
\i SQL/schema/01_types.sql

\echo 'Creating Core Tables...'
\i SQL/schema/02_core.sql

\echo 'Creating Fantasy Tables...'
\i SQL/schema/03_fantasy.sql

\echo 'Creating Performance Indexes...'
\i SQL/schema/04_indexes.sql

\echo 'Creating Views...'
\i SQL/schema/05_views.sql

-- 2. SEED DATA (Initial Static Data)
\echo 'Seeding Game Weeks...'
\i SQL/seeds/01_game_weeks.sql

\echo 'Adding Real Teams...'
\i SQL/seeds/02_add_real_teams.sql

\echo 'Adding Players...'
\i SQL/seeds/03_add_players.sql

\echo 'Adding Real Games of Season 26/27...'
\i SQL/seeds/04_real_games_26_27.sql

\echo 'Adjusting Classifications...'
\i SQL/seeds/05_adjust_classifications.sql

\echo 'Edit Female Players...'
\i SQL/seeds/06_edit_female_players.sql

\echo 'Adding Test Users and Leagues...'
\i SQL/seeds/07_add_test_user_and_league.sql


COMMIT;

\echo 'Database initialization complete!'