const request = require('supertest');
const { app } = require('../app');

describe('League Admin Settings Integration Tests', () => {

    let userOneToken;
    let leagueId;

    beforeAll(async () => {
        const unique = Date.now();
        
        // Register User 1 (Commissioner)
        const user1Res = await request(app)
            .post('/api/v1/auth/register')
            .send({
                username: `commish_${unique}`,
                email: `commish_${unique}@example.com`,
                password: 'Arandompassword23!'
            });
        userOneToken = user1Res.body.data.token;

        const res1 = await request(app)
            .post('/api/v1/fantasy-leagues')
            .set('Authorization', `Bearer ${userOneToken}`)
            .send({ name: 'abLeague', numOfTeams: 8 });

        //console.log('[Test Debug] League Creation Response:', res1.body);
        leagueId = res1.body.data.id
    });

    describe('GET /api/v1/fantasy-leagues/:leagueId/settings', () => {
        it('should return 200 with list of current admin setttings for the league', async() => {
            const resLeagueSettings1 = await request(app)
                .get(`/api/v1/fantasy-leagues/${leagueId}/settings`)
                .set('Authorization', `Bearer ${userOneToken}`);
            //console.log('[Test Debug] League Settings Response Body:', resLeagueSettings1.body);
            expect(resLeagueSettings1.status).toBe(200);
            expect(resLeagueSettings1.body.data).toHaveProperty('league_id');
        });

    });
});