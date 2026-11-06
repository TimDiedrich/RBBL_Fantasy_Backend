require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

const errorHandler = require('./middlewares/errorHandler');
const ApiError = require('./utils/ApiError');
const swaggerSpec = require('./swaggerSpec');

const playerRoutes = require('./routes/playerRoutes');
const userRoutes = require('./routes/userRoutes');
const fantasyLeagueRoutes = require('./routes/fantasyLeagueRoutes');
const fantasyTeamRoutes = require('./routes/fantasyTeamRoutes');
const standingsRoutes = require('./routes/standingsRoutes');
const rosterRoutes = require('./routes/rosterRoutes');
const realGamesRoutes = require('./routes/realGamesRoutes');
const leagueAdminSettingsRoutes = require('./routes/leagueAdminSettingsRoutes');
const draftRoutes = require('./routes/draftRoutes');
const healthRoutes = require('./routes/healthRoutes');

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
    const createAuthError = (message) => {
        const error = new Error(message);
        error.data = { code: 'UNAUTHENTICATED', message };
        return error;
    };

    if (!token) {
        console.error('[Socket Auth] Missing token in handshake');
        return next(createAuthError('Access token is required.'));
    }

    try {
        const rawToken = token.startsWith('Bearer ') ? token.slice(7) : token;
        const decoded = jwt.verify(rawToken, process.env.JWT_SECRET);

        //console.log('[Socket Auth Success] Decoded JWT Payload:', decoded);

        socket.user = decoded;
        next();
    } catch (err) {
        console.error('[Socket Auth Failed]:', err.message);
        next(createAuthError('Access token is invalid or expired.'));
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

// Versioned API routes.

const apiRouter = express.Router();

apiRouter.use('/', userRoutes);
apiRouter.use('/fantasy-leagues', fantasyLeagueRoutes);
apiRouter.use('/fantasy-leagues', standingsRoutes);
apiRouter.use('/fantasy-leagues', leagueAdminSettingsRoutes);
apiRouter.use('/fantasy-leagues', draftRoutes);
apiRouter.use('/fantasy-leagues/:leagueId/players', playerRoutes);
apiRouter.use('/fantasy-teams', fantasyTeamRoutes);
apiRouter.use('/fantasy-teams', rosterRoutes);
apiRouter.use('/real-games', realGamesRoutes);
apiRouter.use('/health', healthRoutes);

app.get('/api/v1/openapi.json', (req, res) => res.json(swaggerSpec));
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/v1', apiRouter);

// 404
app.use((req, res, next) => {
    next(ApiError.notFound('Route not found.'));
});

// Global Error Handler MUST be last
app.use(errorHandler);


module.exports = { app, server };