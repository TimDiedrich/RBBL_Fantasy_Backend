INSERT INTO users (id, username, email, pw_hash)
VALUES
('1', 'tim', 'tim-diedrich@gmx.de', '$2b$12$F7acZkbBr12K75Gfa45fd.aj.8VGOs9Fgmn4vgO7pe719Wg3AuHjW'),
('2', 'Standard2', 'test@test.de', '$2b$12$ogP5Q0EJzmkMHDX/yIM35e1lIT1HoqJT8kZ8f7//1fZEis.KwCkRa');


-- Automatically sync the sequence to the highest insert ID
SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1)) FROM users;
---------------------------------------------------------------------------------------------------

---------------------------------------------------------------------------------------------------
INSERT INTO fantasy_leagues (id, league_name, commissioner_id, max_number_teams, invite_code)
VALUES ('1', 'MyLeague1', '1', '4', 'AF8531F8');

-- Automatically sync the sequence to the highest insert ID
SELECT setval(pg_get_serial_sequence('fantasy_leagues', 'id'), COALESCE(MAX(id), 1)) FROM fantasy_leagues;
---------------------------------------------------------------------------------------------------

---------------------------------------------------------------------------------------------------
INSERT INTO league_members (league_id, user_id, "role")
VALUES ('1', '1', 'COMMISSIONER');

-- Automatically sync the sequence to the highest insert ID
SELECT setval(pg_get_serial_sequence('league_members', 'id'), COALESCE(MAX(id), 1)) FROM league_members;
---------------------------------------------------------------------------------------------------

---------------------------------------------------------------------------------------------------
INSERT INTO fantasy_players (
            league_id,
            original_player_id,
            shirt_number, player_name,
            image_url, dob, nationality,
            position,
            sport_class,
            team_id
            )
            SELECT '1', id, shirt_number, player_name, image_url, dob, nationality, position, sport_class, team_id
            FROM players
            WHERE is_active = TRUE;

-- Automatically sync the sequence to the highest insert ID
SELECT setval(pg_get_serial_sequence('fantasy_players', 'id'), COALESCE(MAX(id), 1)) FROM fantasy_players;
---------------------------------------------------------------------------------------------------

---------------------------------------------------------------------------------------------------
INSERT INTO league_settings (league_id)
VALUES ('1');

-- Automatically sync the sequence to the highest insert ID
-- TODO check, because foreign key is primary key
-- SELECT setval(pg_get_serial_sequence('league_settings', 'id'), COALESCE(MAX(id), 1)) FROM league_settings;
---------------------------------------------------------------------------------------------------

---------------------------------------------------------------------------------------------------
INSERT INTO fantasy_teams (league_id, user_id, team_name)
VALUES ('1', '1', 'MyTeam1');

-- Automatically sync the sequence to the highest insert ID
SELECT setval(pg_get_serial_sequence('fantasy_teams', 'id'), COALESCE(MAX(id), 1)) FROM fantasy_teams;
---------------------------------------------------------------------------------------------------
