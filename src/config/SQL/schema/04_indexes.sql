CREATE INDEX idx_players_team_id ON players(team_id);
CREATE INDEX idx_fantasy_players_league ON fantasy_players(league_id);
CREATE INDEX idx_player_game_stats_player ON player_game_stats(player_id);
CREATE INDEX idx_player_game_stats_game ON player_game_stats(game_id);
CREATE INDEX idx_matchups_league_week ON matchups(league_id, game_week_id);
CREATE INDEX idx_weekly_lineups_team_week ON weekly_lineups(fantasy_team_id, game_week_id);