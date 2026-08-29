CREATE TABLE IF NOT EXISTS fantasy_leagues (
    id SERIAL PRIMARY KEY,
	league_name VARCHAR (100) NOT NULL,
	commissioner_id INT REFERENCES users(id) ON DELETE CASCADE,
	invite_code VARCHAR(10) UNIQUE NOT NULL,
	draft_status draft_status DEFAULT 'PREDRAFT',
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS league_members (
    id SERIAL PRIMARY KEY,
	league_id INT NOT NULL REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
	user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	role league_role DEFAULT 'MEMBER', -- 'COMMISSIONER', 'MEMBER', 'ADMIN?'
	joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT unique_user_per_league UNIQUE (league_id, user_id)
);

CREATE TABLE IF NOT EXISTS league_settings (
    league_id INT PRIMARY KEY REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
	max_lineup_points NUMERIC(3, 1) DEFAULT 14.5, -- RBBL point cap
	max_roster_size INT DEFAULT 10, --maybe 12?
	points_per_real_point NUMERIC(3, 2) DEFAULT 1.0,
	points_per_rebound NUMERIC(3, 2) DEFAULT 1.2,
	points_per_assist NUMERIC(3, 2) DEFAULT 1.5,
	points_per_steal NUMERIC(3, 2) DEFAULT 3.0,
	points_per_block NUMERIC(3, 2) DEFAULT 3.0,
	points_per_turnover NUMERIC(3, 2) DEFAULT -2.0,
	double_double_bonus NUMERIC(3, 2) DEFAULT 3.0,
	triple_double_bonus NUMERIC(3, 2) DEFAULT 5.0,
	three_point_made NUMERIC(3, 2) DEFAULT 0.5
	-- more ideas?
);

CREATE TABLE IF NOT EXISTS fantasy_players (
	id SERIAL PRIMARY KEY,
	league_id INT REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
	original_player_id INT REFERENCES players(id) ON DELETE SET NULL,
	shirt_number INT,
	player_name VARCHAR(150) NOT NULL,
	image_url VARCHAR(1024),
	dob DATE,
	nationality VARCHAR(3),
	position VARCHAR(5),
	sport_class NUMERIC(2, 1) NOT NULL,
	gender gender DEFAULT 'MALE',
	bonus NUMERIC(2, 1) DEFAULT 0.0,
	team_id VARCHAR(8) REFERENCES teams(team_id) ON DELETE SET NULL,
	is_active BOOLEAN DEFAULT TRUE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	
	CONSTRAINT check_sport_class 
		CHECK (
		sport_class IN (1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0)
		AND 
		bonus IN (0.0, 0.5, 1.0, 1.5, 2.0)
		) 
		-- what are the bonus categories?
);

CREATE TABLE IF NOT EXISTS fantasy_teams (
    id SERIAL PRIMARY KEY,
	league_id INT REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
	user_id INT REFERENCES users(id) ON DELETE CASCADE,
	team_name VARCHAR(100) NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT one_team_per_player_per_league
	    UNIQUE(league_id, user_id)
);

CREATE TABLE IF NOT EXISTS rosters (
    id SERIAL PRIMARY KEY,
	fantasy_team_id INT REFERENCES fantasy_teams(id) ON DELETE CASCADE,
	player_id INT REFERENCES fantasy_players(id) ON DELETE CASCADE,
	is_starter BOOLEAN DEFAULT FALSE,

	CONSTRAINT unique_player_per_fantasy_team
	    UNIQUE (fantasy_team_id, player_id)
);

CREATE TABLE IF NOT EXISTS weekly_lineups (
    id SERIAL PRIMARY KEY,
	fantasy_team_id INT REFERENCES fantasy_teams(id) ON DELETE CASCADE,
	player_id INT REFERENCES fantasy_players(id) ON DELETE CASCADE,
	game_week_id INT REFERENCES game_weeks(id) ON DELETE CASCADE,
	is_starter BOOLEAN DEFAULT FALSE,

	CONSTRAINT unique_player_per_week UNIQUE (fantasy_team_id, player_id, game_week_id)
);



CREATE TABLE IF NOT EXISTS matchups (
    id SERIAL PRIMARY KEY,
	league_id INT REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
	game_week_id INT REFERENCES game_weeks(id) ON DELETE CASCADE,
	home_team_id INT REFERENCES fantasy_teams(id) ON DELETE CASCADE,
	away_team_id INT REFERENCES fantasy_teams(id) ON DELETE CASCADE,
	home_score NUMERIC(6, 2) DEFAULT 0,
	away_score NUMERIC(6, 2) DEFAULT 0,

	CONSTRAINT different_matchup_teams CHECK (home_team_id <> away_team_id)
);


CREATE TABLE IF NOT EXISTS draft_picks (
    id SERIAL PRIMARY KEY,
	league_id INT REFERENCES fantasy_leagues(id) ON DELETE CASCADE,
	round INT NOT NULL,
	pick_number INT NOT NULL, -- Overall pick number (e.g. 1 to 120)
	fantasy_team_id INT REFERENCES fantasy_teams(id) ON DELETE CASCADE,
	fantasy_player_id INT REFERENCES fantasy_players(id) ON DELETE CASCADE,
	picked_at TIMESTAMP WITH TIME ZONE,

	CONSTRAINT unique_pick_per_league UNIQUE (league_id, round, pick_number)
);