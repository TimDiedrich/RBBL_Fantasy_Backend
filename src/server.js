require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');

const errorHandler = require('./middlewares/errorHandler');

const playerRoutes = require('./routes/playerRoutes');
const userRoutes = require('./routes/userRoutes');
const fantasyLeagueRoutes = require('./routes/fantasyLeagueRoutes');
const fantasyTeamRoutes = require('./routes/fantasyTeamRoutes');
const standingsRoutes = require('./routes/standingsRoutes');
const rosterRoutes = require('./routes/rosterRoutes');
const realGamesRoutes = require('./routes/realGamesRoutes');
const leagueAdminSettingsRoutes = require('./routes/leagueAdminSettingsRoutes');
const healthRoutes = require('./routes/healthRoutes');

// Socket handlers
const draftService = require('./services/draftService');

const app = express();

app.use(helmet())
app.use(express.json());

// CREATE HTTP SERVER INSTANCE FROM EXPRESS APP
const server = http.createServer(app);

// ATTACH SOCKET.IO TO HTTP SERVER
const io = new Server(server, {
    cors: {
        origin: '*', // TODO Adjust for production security if needed
        methods: ['GET', 'POST']
    }
});

// Attach io Express app so HTTP controllers can emit events if needed
app.set('io', io);

// SOCKET AUTHENTICATION MIDDLEWARE
io.use((socket, next) =>{
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];

    if (!token) {
        console.error('[Socket Auth] Missing token in handshake');
        return next(new Error('Authentication error: Token missing'));
    }

    try {
        const rawToken = token.startsWith('Bearer ') ? token.slice(7) : token;
        const decoded = jwt.verify(rawToken, process.env.JWT_SECRET);

        //console.log('[Socket Auth Success] Decoded JWT Payload:', decoded);

        socket.user = decoded;
        next();
    } catch (err) {
        console.error('[Socket Auth Failed]:', err.message);
        next(new Error('Authentication error: Invalid or expired token'));
    }
});

// SOCKET CONNECTION & EVENT REGISTRATION
io.on('connection', (socket) => {
    console.log(`[Socket Connect] USER ID: ${socket.user.userId} | Socket ID: ${socket.id}`);
    // Register modular draft event handlers
    draftService(io, socket);

    socket.on('disconnect', (reason) => {
        console.log(`[Socket Disconnected] User ID: ${socket.user.userId} | Reason: ${reason}`);
    });
});


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
apiRouter.use('/league_admin_settings', leagueAdminSettingsRoutes);
apiRouter.use('/health', healthRoutes);

app.use('/api', apiRouter);
//app.use('/api/v1', apiV1Router);

// 404
app.use((req, res, next) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler MUST be last
app.use(errorHandler);

// For dev in home network
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Home Network Server running on http://0.0.0.0:${PORT}`);
});
