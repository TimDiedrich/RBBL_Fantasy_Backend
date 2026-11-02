const request = require('supertest');
const { app } = require('../app');

describe('Fantasy League End-to-End Integration Tests', () => {
  let userOneToken;
  let userTwoToken;
  let createdLeagueId;
  let leagueInviteCode;

  // Setup: Register two unique users so we can test league creation and joining
  beforeAll(async () => {
    const unique = Date.now();

    // Register User 1 (Commissioner)
    const user1Res = await request(app)
      .post('/api/users/register')
      .send({
        username: `commish_${unique}`,
        email: `commish_${unique}@example.com`,
        password: 'Arandompassword23!'
      });

    userOneToken = user1Res.body.token;

    // Register User 2 (League Member)
    const user2Res = await request(app)
      .post('/api/users/register')
      .send({
        username: `member_${unique}`,
        email: `member_${unique}@example.com`,
        password: 'Arandompassword23!'
      });
    userTwoToken = user2Res.body.token;
  });

  describe('POST /api/fantasy_league/create', () => {
    it('should return 400 if league name violates regex format or team count is invalid', async () => {
      // Test invalid league name (too short / special characters)
      const res1 = await request(app)
        .post('/api/fantasy_league/create')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ name: 'ab', numOfTeams: 10 });

      expect(res1.status).toBe(400);
      expect(res1.body.error).toContain('League name must be 3-30 characters');

      // Test invalid number of teams
      const res2 = await request(app)
        .post('/api/fantasy_league/create')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({ name: 'ValidLeague', numOfTeams: 'not-a-number' });

      expect(res2.status).toBe(400);
      expect(res2.body.error).toBe('Invalid number of teams.');
    });

    it('should successfully create a league, run transaction, seed players, and return invite code', async () => {
      const response = await request(app)
        .post('/api/fantasy_league/create')
        .set('Authorization', `Bearer ${userOneToken}`)
        .send({
          name: 'RBBL_League',
          numOfTeams: 8
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('invite_code');
      expect(response.body.league_name).toBe('RBBL_League');
      expect(response.body.max_number_teams).toBe(8);

      createdLeagueId = response.body.id;
      leagueInviteCode = response.body.invite_code;
    });
  });

  describe('POST /api/fantasy_league/join', () => {
    it('should allow a second user to join the league using the invite code', async () => {
      const response = await request(app)
        .post('/api/fantasy_league/join')
        .set('Authorization', `Bearer ${userTwoToken}`)
        .send({
          invite_code: leagueInviteCode
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Succesfully joined league!');
      expect(response.body.league).toHaveProperty('id', createdLeagueId);
    });

    it('should prevent a user from joining the same league twice (Conflict)', async () => {
      const response = await request(app)
        .post('/api/fantasy_league/join')
        .set('Authorization', `Bearer ${userTwoToken}`)
        .send({
          invite_code: leagueInviteCode
        });

      expect(response.status).toBe(409); // Conflict error
      expect(response.body.error).toContain('You are already a member');
    });
  });

  describe('GET /api/fantasy_league/get_memberships', () => {
    it('should fetch all league memberships for the authenticated user', async () => {
      const response = await request(app)
        .get('/api/fantasy_league/get_memberships')
        .set('Authorization', `Bearer ${userTwoToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('league_name', 'RBBL_League');
    });
  });

  describe('GET /api/fantasy_league/:id', () => {
    it('should fetch complete league details including settings and commissioner info', async () => {
      const response = await request(app)
        .get(`/api/fantasy_league/${createdLeagueId}`)
        .set('Authorization', `Bearer ${userTwoToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', createdLeagueId);
      expect(response.body).toHaveProperty('commissioner_username');
      expect(response.body).toHaveProperty('settings');
      expect(response.body.settings).toHaveProperty('max_roster_size');
    });
  });

});