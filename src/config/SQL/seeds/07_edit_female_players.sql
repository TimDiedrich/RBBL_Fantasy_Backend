UPDATE fantasy_players
SET
    gender = 'FEMALE',
	bonus = 1.5
WHERE player_name IN (
        'Amber Heijkamp',
		'Annika Sonnleitner',
		'Dagmar van Hinte',
		'Hannah Dodd',
		'Helen Freeman',
		'Ilse Arts',
		'Katharina Lang',
		'Lisa Bergenthal',
		'Marie Kier',
		'Mariska Beijer',
		'Mary Silberman',
		'Meggie Gay',
		'Nathalie Paßiwan',
		'Rose Hollerman',
		'Svenja Erni',
		'Silvana van Hees',
		'Tuva Reinshagen',
		'Vanessa Erskine-Sadler'
);