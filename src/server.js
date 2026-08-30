require('dotenv').config();
const express = require('express');
const helmet = require('helmet');

const errorHandler = require('./middlewares/errorHandler');

const playerRoutes = require('./routes/playerRoutes');
const userRoutes = require('./routes/userRoutes');
const fantasyLeagueRoutes = require('./routes/fantasyLeagueRoutes');
const fantasyTeamRoutes = require('./routes/fantasyTeamRoutes');
const standingsRoutes = require('./routes/standingsRoutes');
const rosterRoutes = require('./routes/rosterRoutes');
const realGamesRoutes = require('./routes/realGamesRoutes');
const leagueAdminSettings = require('./routes/leagueAdminSettingsRoutes');

const app = express();

app.use(helmet())
app.use(express.json());

// Production HTTPS enforcment
if (process.env.NODE_ENV === 'production') {
    app.enable('trust proxy');
    app.use((req, res, next) => {
        if (req.secure || req.headers['x-forwarded-proto'] === 'https'){
            return next();
        }
        const host = req.headers.host || req.hostname;
        return res.redirect(301, `https://${host}${req.originalUrl}`);
    });
}

const PORT = process.env.PORT || 3000;

// 1. VERSIONED ROUTE BASE PATH (/api/v1)
// const apiV1Router = express.Router();

const apiRouter = express.Router();

apiRouter.use('/players', playerRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/fantasy_league', fantasyLeagueRoutes);
apiRouter.use('/fantasy_teams', fantasyTeamRoutes);
apiRouter.use('/standings', standingsRoutes);
apiRouter.use('/rosters', rosterRoutes);
apiRouter.use('/real_games', realGamesRoutes);
apiRouter.use('/league_admin_settings', leagueAdminSettings);

app.use('/api', apiRouter);
//app.use('/api/v1', apiV1Router);

// 404
app.use((req, res, next) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler MUST be last
app.use(errorHandler);

// For dev in home network
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Home Network Server running on http://0.0.0.0:${PORT}`);
});
