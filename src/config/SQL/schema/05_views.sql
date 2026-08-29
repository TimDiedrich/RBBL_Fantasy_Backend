CREATE OR REPLACE VIEW league_standings AS
WITH team_stats AS (
-- Collect home team results
	SELECT 
        m.league_id,
        m.home_team_id AS team_id,
        CASE WHEN m.home_score > m.away_score THEN 1 ELSE 0 END AS win,
        CASE WHEN m.home_score < m.away_score THEN 1 ELSE 0 END AS loss,
        CASE WHEN m.home_score = m.away_score THEN 1 ELSE 0 END AS tie,
        m.home_score AS points_for
    FROM matchups m

	UNION ALL

	-- Collect away team results
	
	SELECT 
        m.league_id,
        m.away_team_id AS team_id,
        CASE WHEN m.away_score > m.home_score THEN 1 ELSE 0 END AS win,
        CASE WHEN m.away_score < m.home_score THEN 1 ELSE 0 END AS loss,
        CASE WHEN m.away_score = m.home_score THEN 1 ELSE 0 END AS tie,
        m.away_score AS points_for
    FROM matchups m
)
SELECT
    ft.id AS team_id,
	ft.league_id,
	ft.team_name,
	COALESCE(SUM(ts.win), 0) AS wins,
	COALESCE(SUM(ts.loss), 0) AS losses,
	COALESCE(SUM(ts.tie), 0) AS ties,
	COALESCE(SUM(ts.points_for), 0) AS total_points,
	DENSE_RANK() OVER (
        PARTITION BY ft.league_id
		ORDER BY -- TODO implement order by direct comparison?
		    COALESCE(SUM(ts.win), 0) DESC,
			COALESCE(SUM(ts.points_for), 0) DESC
	) AS rank
FROM fantasy_teams ft
LEFT JOIN team_stats ts ON ft.id = ts.team_id
GROUP BY ft.id, ft.league_id, ft.team_name;
