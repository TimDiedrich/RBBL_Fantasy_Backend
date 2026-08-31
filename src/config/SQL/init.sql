SET client_encoding = 'UTF8';
SET client_min_messages = warning;
BEGIN;

-- 0. CLEANUP FIRST
\echo 'Wiping old schema...'
\i src/config/SQL/reset.sql

-- 1. SCHEMA MIGRATIONS (Structure)
\echo 'Creating Types...'
\i src/config/SQL/schema/01_types.sql

\echo 'Creating Core Tables...'
\i src/config/SQL/schema/02_core.sql

\echo 'Creating Fantasy Tables...'
\i src/config/SQL/schema/03_fantasy.sql

\echo 'Creating Performance Indexes...'
\i src/config/SQL/schema/04_indexes.sql

\echo 'Creating Views...'
\i src/config/SQL/schema/05_views.sql

-- 2. SEED DATA (Initial Static Data)
\echo 'Seeding Game Weeks...'
\i src/config/SQL/seeds/01_game_weeks.sql

\echo 'Adding Real Teams...'
\i src/config/SQL/seeds/02_add_real_teams.sql

\echo 'Adding Players...'
\i src/config/SQL/seeds/03_add_players.sql

\echo 'Adding Real Games of Season 26/27...'
\i src/config/SQL/seeds/04_real_games_26_27.sql

\echo 'Adjusting Classifications...'
\i src/config/SQL/seeds/05_adjust_classifications.sql

\echo 'Adding Test Users and Leagues...'
\i src/config/SQL/seeds/06_add_test_user_and_league.sql

\echo 'Edit Female Players...'
\i src/config/SQL/seeds/07_edit_female_players.sql


COMMIT;
\if :ERROR
  \echo 'FAILED: Database initialization encountered errors!'
\else
  \echo 'SUCCESS: Database initialization complete!'
\endif
--\echo 'Database initialization complete!'