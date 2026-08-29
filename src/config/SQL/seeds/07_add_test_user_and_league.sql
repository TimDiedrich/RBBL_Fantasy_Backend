INSERT INTO users (id, username, email, pw_hash)
VALUES
('1', 'tim', 'tim-diedrich@gmx.de', '$2b$12$F7acZkbBr12K75Gfa45fd.aj.8VGOs9Fgmn4vgO7pe719Wg3AuHjW');


INSERT INTO fantasy_leagues (league_name, commissioner_id, invite_code)
VALUES ('MyLeague1', '1', 'AF8531F8');

INSERT INTO league_members (league_id, user_id, "role")
VALUES ('1', '1', 'COMMISSIONER');

INSERT INTO fantasy_players (
            league_id, original_player_id, shirt_number, player_name, image_url, dob, nationality, position, sport_class, team_id
            )
            SELECT '1', id, shirt_number, player_name, image_url, dob, nationality, position, sport_class, team_id
            FROM players
            WHERE is_active = TRUE;

INSERT INTO league_settings (league_id)
VALUES ('1');

INSERT INTO fantasy_teams (league_id, user_id, team_name)
VALUES ('1', '1', 'MyTeam1');
