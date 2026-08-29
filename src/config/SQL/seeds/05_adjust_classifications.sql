UPDATE fantasy_players
    SET sport_class = 4.5
	WHERE player_name IN (
        'Johannes Hengst',
		'Sven Diedrich',
		'Sören Müller',
		'Tim Diedrich',
		'Vahid Gholamazad',
		'Aliaksandr Halouski',
		'Vahid Atefimonfared',
		'Helen Freeman',
		'Mary Silberman',
		'Len van Dort'
);

UPDATE fantasy_players
    SET sport_class = 1.0
	WHERE player_name IN (
        'Sören Gebauer',
		'Philipp Schorp',
		'Hayden Siebuhr',
		'Lukas Gloßner',
		'Isaac Lipscomb',
		'Hannah Dodd',
		'Meggie Gay'
);

UPDATE fantasy_players
    SET sport_class = 1.5
	WHERE player_name IN (
        'Ilse Arts',
		'Anil Cegil'
);

UPDATE fantasy_players
    SET sport_class = 2.0
    WHERE player_name IN (
        'Teemu Partanen',
		'Lars Bergenthal'
);

UPDATE fantasy_players
    SET sport_class = 2.5
    WHERE player_name IN (
        'Jordi Ruiz Jordan',
		'Joakim Linden',
		'Lachlin Dalton'
);

UPDATE fantasy_players
    SET sport_class = 3.0
    WHERE player_name IN (
        'Jens Eike Albrecht',
		'Boris van Hunnik'
);

UPDATE fantasy_players
    SET sport_class = 3.5
    WHERE player_name IN (
        'Arie Twigt',
		'Steven Elliott'
);

UPDATE fantasy_players
    SET sport_class = 4.0
    WHERE player_name IN ('');

	
--SELECT player_name FROM fantasy_players
--WHERE sport_class = 5.0;
