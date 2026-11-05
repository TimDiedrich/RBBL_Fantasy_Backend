const request = require('supertest');
const { app } = require('../app');

describe('Fantasy League End-to-End Integration Tests', () => {
  let userOneToken;
  let userTwoToken;
  let outsiderToken;
  let createdLeagueId;
  let leagueInviteCode;
  let createdTeamId;

  // Setup: Register two unique users so we can test league creation and joining
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

    // Register User 2 (League Member)
    const user2Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `member_${unique}`,
        email: `member_${unique}@example.com`,
        password: 'Arandompassword23!'
      });
    userTwoToken = user2Res.body.data.token;

    const outsiderRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `outsider_${unique}`,
        email: `outsider_${unique}@example.com`,
        password: 'Arandompassword23!'
      });
    outsiderToken = outsiderRes.body.data.token;
  });

  describe('POST /api/v1/fantasy-leagues', () => {
    it('should return 400 if league name violates regex format or team count is invalid', async () => {
      // Test invalid league name (too short / special characters)
      const res1 = await request(app)
        .post('/api/v1/fantasy-leagues')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ name: 'ab', numOfTeams: 10 });

      expect(res1.status).toBe(400);
      expect(res1.body.error.code).toBe('BAD_REQUEST');
      expect(res1.body.error.message).toContain('League name must be 3-30 characters');

      // Test invalid number of teams
      const res2 = await request(app)
        .post('/api/v1/fantasy-leagues')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ name: 'ValidLeague', numOfTeams: 'not-a-number' });

      expect(res2.status).toBe(400);
      expect(res2.body.error).toEqual({
        code: 'BAD_REQUEST',
        message: 'Invalid number of teams.'
      });
    });

    it('should successfully create a league, run transaction, seed players, and return invite code', async () => {
      const response = await request(app)
        .post('/api/v1/fantasy-leagues')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({
          name: 'RBBL_League',
          numOfTeams: 8
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('invite_code');
      expect(response.body.data.league_name).toBe('RBBL_League');
      expect(response.body.data.max_number_teams).toBe(8);

      createdLeagueId = response.body.data.id;
      leagueInviteCode = response.body.data.invite_code;
    });
  });

  describe('POST /api/v1/fantasy-leagues/memberships', () => {
    it('should allow a second user to join the league using the invite code', async () => {
      const response = await request(app)
        .post('/api/v1/fantasy-leagues/memberships')
        .set('Authorization', `Bearer ${userTwoToken}`)
        .send({
          invite_code: leagueInviteCode
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('message', 'Succesfully joined league!');
      expect(response.body.data.league).toHaveProperty('id', createdLeagueId);
    });

    it('should prevent a user from joining the same league twice (Conflict)', async () => {
      const response = await request(app)
        .post('/api/v1/fantasy-leagues/memberships')
        .set('Authorization', `Bearer ${userTwoToken}`)
        .send({
          invite_code: leagueInviteCode
        });

      expect(response.status).toBe(409); // Conflict error
      expect(response.body.error.code).toBe('CONFLICT');
      expect(response.body.error.message).toContain('You are already a member');
    });
  });

  describe('GET /api/v1/fantasy-leagues/memberships', () => {
    it('should fetch all league memberships for the authenticated user', async () => {
      const response = await request(app)
        .get('/api/v1/fantasy-leagues/memberships')
        .set('Authorization', `Bearer ${userTwoToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('league_name', 'RBBL_League');
    });
  });

  describe('GET /api/v1/fantasy-leagues/:leagueId', () => {
    it('should fetch complete league details including settings and commissioner info', async () => {
      const response = await request(app)
        .get(`/api/v1/fantasy-leagues/${createdLeagueId}`)
        .set('Authorization', `Bearer ${userTwoToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('id', createdLeagueId);
      expect(response.body.data).toHaveProperty('commissioner_username');
      expect(response.body.data).toHaveProperty('settings');
      expect(response.body.data.settings).toHaveProperty('max_roster_size');
    });
  });

  describe('League and team authorization', () => {
    it('should deny league data to authenticated nonmembers', async () => {
      const protectedPaths = [
        `/api/v1/fantasy-leagues/${createdLeagueId}`,
        `/api/v1/fantasy-leagues/${createdLeagueId}/players`,
        `/api/v1/fantasy-leagues/${createdLeagueId}/standings`,
        `/api/v1/fantasy-leagues/${createdLeagueId}/settings`,
        `/api/v1/fantasy-leagues/${createdLeagueId}/draft-order`
      ];

      for (const path of protectedPaths) {
        const response = await request(app)
          .get(path)
          .set('Authorization', `Bearer ${outsiderToken}`);

        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('FORBIDDEN');
      }
    });

    it('should deny league updates to a member who is not the commissioner', async () => {
      const response = await request(app)
        .patch(`/api/v1/fantasy-leagues/${createdLeagueId}`)
        .set('Authorization', `Bearer ${userTwoToken}`)
        .send({ league_name: 'Unauthorized_Update' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow a member to create one team in the league', async () => {
      const response = await request(app)
        .post('/api/v1/fantasy-teams')
        .set('Authorization', `Bearer ${userTwoToken}`)
        .send({ league_id: createdLeagueId, team_name: 'Member_Team' });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('league_id', createdLeagueId);
      createdTeamId = response.body.data.id;
    });

    it('should deny team creation to authenticated nonmembers', async () => {
      const response = await request(app)
        .post('/api/v1/fantasy-teams')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ league_id: createdLeagueId, team_name: 'Outsider_Team' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow league members to view another member roster, but deny nonmembers', async () => {
      const memberResponse = await request(app)
        .get(`/api/v1/fantasy-teams/${createdTeamId}/roster`)
        .set('Authorization', `Bearer ${userOneToken}`);

      expect(memberResponse.status).toBe(200);
      expect(memberResponse.body.data).toEqual([]);

      const outsiderResponse = await request(app)
        .get(`/api/v1/fantasy-teams/${createdTeamId}/roster`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(outsiderResponse.status).toBe(403);
      expect(outsiderResponse.body.error.code).toBe('FORBIDDEN');
    });

    it('should deny roster mutation by a league member who does not own the team', async () => {
      const response = await request(app)
        .put(`/api/v1/fantasy-teams/${createdTeamId}/roster`)
        .set('Authorization', `Bearer ${userOneToken}`)
        .send([{ roster_id: 999, player_id: 999, is_starter: false }]);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

});