CREATE TABLE IF NOT EXISTS teams (
	id SERIAL PRIMARY KEY,
	team_id VARCHAR(8) NOT NULL UNIQUE,
	name VARCHAR(100) NOT NULL UNIQUE,
	logo_url VARCHAR(1024),
	city VARCHAR(100),
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
	username VARCHAR(50) NOT NULL UNIQUE,
	email VARCHAR(100) NOT NULL UNIQUE,
	pw_hash VARCHAR(255) NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
	id SERIAL PRIMARY KEY,
	shirt_number INT,
	player_name VARCHAR(150) NOT NULL,
	image_url VARCHAR(1024),
	dob DATE,
	age INT, -- backend selection needs adjustment?
	nationality VARCHAR(3),
	position VARCHAR(5),
	sport_class NUMERIC(2, 1) NOT NULL,
	team_id VARCHAR(8) REFERENCES teams(team_id) ON DELETE SET NULL,
	is_active BOOLEAN DEFAULT TRUE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	
	CONSTRAINT check_sport_class 
		CHECK (sport_class IN (1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0))
);

CREATE TABLE IF NOT EXISTS real_games (
    id SERIAL PRIMARY KEY,
	home_team_id VARCHAR(8) REFERENCES teams(team_id), 
	away_team_id VARCHAR(8) REFERENCES teams(team_id),
	game_date TIMESTAMP WITH TIME ZONE NOT NULL,
	home_score INT DEFAULT 0,
	away_score INT DEFAULT 0,

	CONSTRAINT unique_match UNIQUE (home_team_id, away_team_id, game_date)
);

CREATE TABLE IF NOT EXISTS game_weeks (
    id SERIAL PRIMARY KEY,
	-- league_id INT REFERENCES needed?
	week_number INT NOT NULL,
	start_date TIMESTAMPTZ NOT NULL,
	end_date TIMESTAMPTZ NOT NULL,
	is_bye_week BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS player_game_stats (
    id SERIAL PRIMARY KEY,
	player_id INT REFERENCES players(id) ON DELETE CASCADE,
	game_id INT REFERENCES real_games(id) ON DELETE CASCADE,
	-- stats below
	minutes_played INTERVAL NOT NULL DEFAULT '00:00:00',
	two_points_made INT NOT NULL DEFAULT 0,
	two_points_attempted INT NOT NULL DEFAULT 0,
	three_points_made INT NOT NULL DEFAULT 0,
	three_points_attempted INT NOT NULL DEFAULT 0,
	ft_made INT NOT NULL DEFAULT 0,
	ft_attempted INT NOT NULL DEFAULT 0,
	def_rebounds INT NOT NULL DEFAULT 0,
	off_rebounds INT NOT NULL DEFAULT 0,
	assists INT NOT NULL DEFAULT 0,
	personal_fouls INT NOT NULL DEFAULT 0, -- no effect as of now
	steals INT NOT NULL DEFAULT 0,
	blocks INT NOT NULL DEFAULT 0,
	turnovers INT NOT NULL DEFAULT 0,
	points INT NOT NULL DEFAULT 0,
	-- This would be just a copy of the real league data
	-- TODO into fantasy_player_game_stats for the head to heads
	-- fantasy_points_earned NUMERIC(5, 2) NOT NULL DEFAULT 0.0,

	CONSTRAINT unique_players_per_game UNIQUE (player_id, game_id)
);