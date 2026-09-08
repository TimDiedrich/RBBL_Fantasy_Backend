const db  = require('../config/db');

//active Node.js timers: { [leagueId]; TimeoutObject }
const activeTimers = {};

/**
 * Main Service Object
 */
const draftService = {

    /**
     * Start or resume a draft session and set the initial timer
     */
    async startDraft(leagueId, io) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // Get draft room & settings
            const roomRes = await client.query(
                `SELECT dr.*, ls.max_roster_size
                FROM draft_rooms dr
                JOIN league_settings ls ON dr.league_id = ls.league_id
                WHERE dr.league_id = $1`,
            [leagueId]
        );

        if (!roomRes.rows.length) {
            throw new Error('Draft room not found');
        }

        const room = roomRes.rows[0];

        // Get draft order
        const orderRes = await client.query(
            `SELECT fantasy_team_id, draft_position
            FROM draft_order
            WHERE league_id = $1
            ORDER BY draft_position ASC`,
            [leagueId]
        );

        if(!orderRes.rows.length) {
            throw new Error('Draft order has not been generated for this league');
        }

        const draftOrder = orderRes.rows;
        const totalTeams = draftOrder.length;

        // Determine active team for Pick #1 (Snake Logic)
        const firstTeamId = getTeamIdForPick(1, totalTeams, draftOrder);

        // Calculate deadline
        const timePerPickSec = room.time_per_pick_seconds || 90;
        const pickDeadline = new Date(Date.now() + timePerPickSec * 1000);

        // Update room state
        await client.query(
            `UPDATE draft_rooms
            SET status = 'IN_PROGRESS',
                current_round = 1,
                current_pick_number = 1,
                current_fantasy_team_id = $1,
                pick_deadline = $2,
                started_at = CURRENT_TIMESTAMP
            WHERE league_id = $3`,
            [firstTeamId, pickDeadline, leagueId]
        );

        await client.query(
            `UPDATE fantasy_leagues
            SET draft_status = 'IN_PROGRESS'
            WHERE id = $1`,
            [leagueId]
        );

        await client.query('COMMIT');

        const firstTeamEligibleClasses = await getEligibleClassesForTeam(client, firstTeamId, room.max_roster_size || 10);

        // Broadcast start event & start server timeer
        io.to(`draft_${leagueId}`).emit('draft:started', {
            currentRound: 1,
            currentPickNumber: 1,
            currentFantasyTeamId: firstTeamId,
            pickDeadline: pickDeadline.toISOString(),
            eligibleSportClasses: firstTeamEligibleClasses
        });

        this.setTurnTimer(leagueId, timePerPickSec * 1000, io);
        } catch(err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    },

    /**
     * Process a manual or auto pick using PostgreSQL transactions
     */
    async processPick({ leagueId, userId, fantasyPlayerId, isAutoPick = false, io}){
        const client = await db.connect();

        try { 
            await client.query('BEGIN')

            const roomRes = await client.query(
                `SELECT dr.*, ls.max_roster_size
                FROM draft_rooms dr
                JOIN league_settings ls ON dr.league_id = ls.league_id
                WHERE dr.league_id = $1 FOR UPDATE`,
                [leagueId]
            );

            const room = roomRes.rows[0];
            if (!room || room.status !== 'IN_PROGRESS') {
            throw new Error('Draft is not active');
            }

            if(!isAutoPick) {
                const teamRes = await client.query(
                    `
                    SELECT id FROM fantasy_teams
                    WHERE league_id = $1 AND user_id = $2`,
                    [leagueId, userId]
                );

                if(!teamRes.rows.length || teamRes.rows[0].id !== room.current_fantasy_team_id) {
                    throw new Error('It is not your turn to pick');
                }
            }

            const activeTeamId = room.current_fantasy_team_id;

            // Validate player availability
            const playerRes = await client.query(
                `SELECT * FROM fantasy_players
                WHERE id = $1 AND league_id = $2 FOR UPDATE`,
                [fantasyPlayerId, leagueId]
            );

            if(!playerRes.rows.length){
                throw new Error('Player not found in this league.');
            }

            const player = playerRes.rows[0];
            if(player.is_drafted) {
                throw new Error(`${player.player_name} has already been drafted`);
            }

            // Record pick in draft_picks
            await client.query(`
                INSERT INTO draft_picks (league_id, round, pick_number, fantasy_team_id, fantasy_player_id, picked_at, is_auto_pick)
                VALUES($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)`,
                [leagueId, room.current_round, room.current_pick_number, activeTeamId, fantasyPlayerId, isAutoPick]
            );

            // Update fantasy_players table
            await client.query(`
                UPDATE fantasy_players
                SET is_drafted = TRUE,
                drafted_by_team_id = $1
                WHERE id = $2`,
                [activeTeamId, fantasyPlayerId]
            );

            await client.query(`
                INSERT INTO rosters( fantasy_team_id, player_id, is_starter)
                VALUES ($1, $2, FALSE)`,
                [activeTeamId, fantasyPlayerId]
            );

            // Calculate total picks & next round/pick
            const orderRes = await client.query(
                `SELECT fantasy_team_id, draft_position
                FROM draft_order WHERE league_id = $1`,
                [leagueId]
            );

            const draftOrder = orderRes.rows;
            const totalTeams = draftOrder.length;
            const maxRosterSize = room.max_roster_size || 10;
            const totalPossiblePicks = totalTeams * maxRosterSize;

            const nextPickNumber = room.current_pick_number + 1;

            // clear turn timer
            this.clearTurnTimer(leagueId);

            // Check if draft is completed
            if(nextPickNumber > totalPossiblePicks) {
                await client.query(
                    `
                    UPDATE draft_rooms
                    SET status = 'COMPLETED',
                    completed_at = CURRENT_TIMESTAMP
                    WHERE league_id =$1`,
                    [leagueId]
                );

                await client.query(`
                    UPDATE fantasy_leagues
                    SET draft_status = 'POSTDRAFT'
                    WHERE id = $1`,
                    [leagueId]
                );

                await client.query('COMMIT');

                const payload = {
                    pick: {
                        round: room.current_round,
                        pickNumber: room.current_pick_number,
                        fantasyTeamId: activeTeamId,
                        fantasyPlayerId: fantasyPlayerId,
                        playerName: player.player_name,
                        isAutoPick
                    }, 
                    status: 'COMPLETED'
                };

                if (io) {
                    io.to(`draft_${leagueId}`).emit('draft:pick_made', payload);
                    io.to(`draft_${leagueId}`).emit('draft:completed', { message: 'The draft has ended!' });
                }

                return payload;
            }

            // Calculate next turn using Snake Logic
            const nextRound = Math.ceil(nextPickNumber / totalTeams);
            const nextTeamId = getTeamIdForPick(nextPickNumber, totalTeams, draftOrder);

            const timePerPickSec = room.time_per_pick_seconds || 90;
            const nextDeadline = new Date(Date.now() + timePerPickSec * 1000);

            // Update draft room for next turn
            await client.query(
                `UPDATE draft_rooms 
                 SET current_round = $1,
                     current_pick_number = $2,
                     current_fantasy_team_id = $3,
                     pick_deadline = $4
                 WHERE league_id = $5`,
                [nextRound, nextPickNumber, nextTeamId, nextDeadline, leagueId]
            );

            await client.query('COMMIT');

            const nextTeamEligibleClasses = await getEligibleClassesForTeam(client, nextTeamId, maxRosterSize);
            
            const pickPayload = {
                pick: {
                    round: room.current_round,
                    pickNumber: room.current_pick_number,
                    fantasyTeamId: activeTeamId,
                    fantasyPlayerId: fantasyPlayerId,
                    playerName: player.player_name,
                    isAutoPick
                },
                nextTurn: {
                    round: nextRound,
                    pickNumber: nextPickNumber,
                    fantasyTeamId: nextTeamId,
                    pickDeadline: nextDeadline.toISOString(),
                    eligibleSportClasses: nextTeamEligibleClasses
                }
            };

            // Broadcast pick details and schedule next turn timer
            if (io) {
                io.to(`draft_${leagueId}`).emit('draft:pick_made', pickPayload);
                this.setTurnTimer(leagueId, timePerPickSec * 1000, io);
            }

            return pickPayload;

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    },

    /**
     * Set active turn timer in server memory
     */
    setTurnTimer(leagueId, durationMs, io) {
        this.clearTurnTimer(leagueId);

        activeTimers[leagueId] = setTimeout( async() => {
            console.log(`[Draft Timer] Timeout reached for league ${leagueId}. Executing auto-pick...`);
            try {
                await this.executeAutoPick(leagueId, io);
            } catch (err) {
                console.error(`[Draft Timer Error] Auto pick failed for league ${leagueId}:`, err);
            }
        }, durationMs);
    },

    /**
     * Clear active turn timer
     */
    clearTurnTimer(leagueId) {
        if (activeTimers[leagueId]) {
            clearTimeout(activeTimers[leagueId]);
            delete activeTimers[leagueId];
        }
    },

    /**
     * Automatically picks highest priority player form queue OR top available overall player
     * TODO random player chosen.
     */
    async executeAutoPick(leagueId, io) {
        const client = await db.connect();
        try{
            const roomRes = await client.query(
                `SELECT current_fantasy_team_id FROM draft_rooms WHERE league_id = $1 AND status = 'IN_PROGRESS'`,
                [leagueId]
            );

            if (!roomRes.rows.length) return;
            const activeTeamId = roomRes.rows[0].current_fantasy_team_id;

            // 1. Check draft_queues for top priority un-drafted player
            const queueRes = await client.query(
                `SELECT dq.fantasy_player_id 
                 FROM draft_queues dq
                 JOIN fantasy_players fp ON dq.fantasy_player_id = fp.id
                 WHERE dq.fantasy_team_id = $1 AND fp.is_drafted = FALSE
                 ORDER BY dq.priority ASC LIMIT 1`,
                [activeTeamId]
            );

            let chosenPlayerId;

            if(queueRes.rows.length > 0) {
                chosenPlayerId = queueRes.rows[0].fantasy_player_id;
            } else {
                const topPlayerRes = await client.query(
                    `SELECT id FROM fantasy_players 
                     WHERE league_id = $1 AND is_drafted = FALSE AND is_active = TRUE
                     ORDER BY RANDOM() LIMIT 1`,
                    [leagueId]
                );
                // TODO
                const topPlayerResAlt = await client.query(
                    `
                    WITH current_roster AS (
                        SELECT fp.sport_class
                        FROM rosters r
                        JOIN fantasy_players fp ON r.player_id = fp.id
                        WHERE r.fantasy_team_id = $1
                    ),
                    roster_counts AS (
                        SELECT
                            COUNT(*) FILTER (WHERE sport_class IN (4.0, 4.5)) AS tier_high,
                            COUNT(*) FILTER (WHERE sport_class IN (3.0, 3.5)) AS tier_mid_high,
                            COUNT(*) FILTER (WHERE sport_class IN (2.0, 2.5)) AS tier_mid_low,
                            COUNT(*) FILTER (WHERE sport_class <= 1.5)        AS tier_low
                        FROM current_roster
                    )
                    SELECT fp.id
                    FROM fantasy_players fp, roster_counts rc
                    WHERE fp.league_id = $2
                      AND fp.is_drafted = FALSE
                      AND fp.is_active = TRUE
                      AND (
                          (fp.sport_class IN (4.0, 4.5) AND rc.tier_high < 4) OR
                          (fp.sport_class IN (3.0, 3.5) AND rc.tier_mid_high < 4) OR
                          (fp.sport_class IN (2.0, 2.5) AND rc.tier_mid_low < 2) OR 
                          (fp.sport_class <= 1.5        AND rc.tier_low < 3)
                    )
                    ORDER BY RANDOM() LIMIT 1`, 
                    [activeTeamId, leagueId]
                )

                if (!topPlayerRes.rows.length) {
                    console.error(`[Draft Error] No available players left to auto-pick in league ${leagueId}`);
                    return;
                }
                chosenPlayerId = topPlayerRes.rows[0].id;
            }
            // Execute auto pick
            await this.processPick({
                leagueId,
                userId: null,
                fantasyPlayerId: chosenPlayerId,
                isAutoPick: true,
                io
            });
        } finally {
            client.release();
        }
    },

    
};

/**
 * Retrieves the complete draft room state for a league:
 * 1. Current turn / draft status
 * 2. Available (undrafted) players
 */
async function getDraftRoomState(leagueId) {
    try {
        const draftQuery = `
        SELECT 
            dr.league_id AS leagueId,
            dr.status,
            dr.current_round AS currentRound,
            dr.current_pick_number AS currentPickNumber,
            dr.current_fantasy_team_id AS currentFantasyTeamId,
            dr.pick_deadline AS pickDeadline,
            dr.time_per_pick_seconds AS timePerPickSeconds,
            t.team_name AS currentTeamName
        FROM draft_rooms dr
        LEFT JOIN fantasy_teams t ON dr.current_fantasy_team_id = t.id
        WHERE dr.league_id = $1;
        `;

        const draftResult = await db.query(draftQuery, [leagueId]);

        // Default draft room metadata if no active draft room exists yet
        let draftInfo = {
            status: 'NOT_STARTED',
            currentRound: 1,
            currentPickNumber: 1,
            currentFantasyTeamId: null,
            currentTeamName: null,
            pickDeadline: null,
            timePerPickSeconds: 90
        };


        // Override default if record exists in database
        if (draftResult.rows.length > 0) {
            draftInfo = draftResult.rows[0];
        }
        // if (draftResult.rows.length === 0) {
        //    throw new Error(`No active draft found for league ID: ${leagueId}`);
        // }

        // const draftInfo = draftResult.rows[0];

        const playersQuery = `
            SELECT 
                p.id AS id,
                p.player_name AS "playerName",
                p.sport_class AS "sportClass",
                p.bonus AS "bonus",
                p.position AS position,
                p.is_drafted AS "isDrafted"
            FROM fantasy_players p
            WHERE p.league_id = $1
              AND p.is_drafted = FALSE
              AND p.id NOT IN (
                SELECT dp.fantasy_player_id
                FROM draft_picks dp
                WHERE dp.league_id = $1
                  AND dp.fantasy_player_id IS NOT NULL
            )
            ORDER BY p.sport_class DESC, p.player_name ASC;
        `;

        const playersResult = await db.query(playersQuery, [leagueId]);

        return {
            status: draftInfo.status,
            currentTurn: {
                round: draftInfo.currentRound,
                pickNumber: draftInfo.currentPickNumber,
                teamId: draftInfo.currentFantasyTeamId ? String(draftInfo.currentFantasyTeamId) : null,
                teamName: draftInfo.currentTeamName,
                pickDeadline: draftInfo.pickDeadline ? draftInfo.pickDeadline.toISOString() : null,
                timePerPickSeconds: draftInfo.timePerPickSeconds,
                // Classes eligible for current turn if restricted by system
                eligibleSportClasses: [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5] 
            },
            availablePlayers: playersResult.rows.map(player => ({
                id: String(player.id),
                name: player.playerName,
                sportClass: parseFloat(player.sportClass),
                bonus: parseFloat(player.bonus),
                position: player.position,
                isDrafted: false
            }))
        };
    } catch (error) {
        console.error(`[DraftService] Failed to fetch room state for league ${leagueId}`);
        throw error;
    }
}

/**
 * Helper to calculate fantasy_team_id for any given overall pick under Snake Draft
 */
function getTeamIdForPick(pickNumber, totalTeams, draftOrder) {
    const round = Math.ceil(pickNumber / totalTeams);
    const pickInRound = (pickNumber - 1) % totalTeams;

    let positionIndex;
    if (round % 2 === 1) {
        // odd round
        positionIndex = pickInRound;
    } else {
        // even round
        positionIndex = totalTeams - 1 - pickInRound;
    }
    return draftOrder[positionIndex].fantasy_team_id;
}


/**
 * Computes allowed sport_class values for a given team based on current roster limits.
 */
async function getEligibleClassesForTeam(client, fantasyTeamId, maxRosterSize = 10) {
    const res = await client.query(
        `
        WITH current_roster AS (
            SELECT fp.sport_class
            FROM rosters r
            JOIN fantasy_players fp ON r.player_id = fp.id
            WHERE r.fantasy_team_id = $1
        ),
        counts AS (
            SELECT 
                COUNT(*) AS total_count,
                COUNT(*) FILTER (WHERE sport_class IN (4.0, 4.5)) AS tier_high,
                COUNT(*) FILTER (WHERE sport_class IN (3.0, 3.5)) AS tier_mid_high,
                COUNT(*) FILTER (WHERE sport_class IN (2.0, 2.5)) AS tier_mid_low,
                COUNT(*) FILTER (WHERE sport_class <= 1.5)        AS tier_low
            FROM current_roster
        )
        SELECT 
            total_count,
            tier_high, tier_mid_high, tier_mid_low, tier_low,
            GREATEST(0, 1 - tier_high)     AS need_high,
            GREATEST(0, 2 - tier_mid_high) AS need_mid_high,
            GREATEST(0, 1 - tier_mid_low)  AS need_mid_low,
            GREATEST(0, 2 - tier_low)      AS need_low
        FROM counts
        `,
        [fantasyTeamId]
    );

    const stats = res.rows[0];
    const remainingSlots = maxRosterSize - parseInt(stats.total_count, 10);
    const needHigh = parseInt(stats.need_high, 10);
    const needMidHigh = parseInt(stats.need_mid_high, 10);
    const needMidLow = parseInt(stats.need_mid_low, 10);
    const needLow = parseInt(stats.need_low, 10);

    const totalMinimumsNeeded = needHigh + needMidHigh + needMidLow + needLow;

    // Tiers mapping
    const tiers = [
        { name: 'high', values: [4.0, 4.5], count: parseInt(stats.tier_high, 10), max: 4, need: needHigh },
        { name: 'midHigh', values: [3.0, 3.5], count: parseInt(stats.tier_mid_high, 10), max: 4, need: needMidHigh },
        { name: 'midLow', values: [2.0, 2.5], count: parseInt(stats.tier_mid_low, 10), max: 2, need: needMidLow },
        { name: 'low', values: [1.0, 1.5], count: parseInt(stats.tier_low, 10), max: 3, need: needLow } // Covers 1.5 or lower
    ];

    const eligibleClasses = [];

    // Force strict selection if remaining slots match total minimums needed
    const strictMode = remainingSlots <= totalMinimumsNeeded && totalMinimumsNeeded > 0;

    for (const tier of tiers) {
        // Skip if max cap reached
        if (tier.count >= tier.max) continue;

        // In strict mode, only allow tiers that still have unmet minimums
        if (strictMode && tier.need <= 0) continue;

        eligibleClasses.push(...tier.values);
    }

    return eligibleClasses;
}

/**
 * Socket.io Event Handler Regstraton
 * Export this function directly satisfies server.js -> draftService(io, socket)
 */
module.exports = function handleDraftSockets(io, socket) {
    socket.on('draft:join_room', async ({ leagueId }) => {
        socket.join(`draft_${leagueId}`);
        console.log(`User ${socket.user.userId} joined room draft_${leagueId}`);

        try {
            const roomState = await getDraftRoomState(leagueId);

            socket.emit('draft:room_state', roomState);
        } catch (err) {
            socket.emit('draft:error', { message: err.message });
        }
    });

    socket.on('draft:leave_room', ({ leagueId }) => {
        socket.leave(`draft_${leagueId}`);
        console.log(`User ${socket.user.userId} left room draft_${leagueId}`);
    });

    socket.on('draft:make_pick', async(data) => {
        try{
            const {leagueId, fantasyPlayerId } = data;
            const result = await draftService.processPick({
                leagueId,
                userId: socket.user.id, // from JWT middleware
                fantasyPlayerId,
                isAutoPick: false,
                io
            });

            // Optional acknowledge back to emitting sockete
            socket.emit('draft:pick_success', result);
        } catch (err) {
            socket.emit('draft:error', { message: err.message });
        }
    });

    // admin starts draft
    socket.on('draft:start', async ({ leagueId }) => {
        try {
            await draftService.startDraft(leagueId, io);
        } catch (err) {
            socket.emit('draft:error', { message: err.message });
        }
    });
};

module.exports.service = draftService;