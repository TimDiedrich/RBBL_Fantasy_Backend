const request = require('supertest');
const { app } = require('../app');

describe('User Authentication Integration Tests', () => {

  const randSuffix = Date.now();
  const testUser = {
    username: `user_${randSuffix}`,
    email: `test_${randSuffix}@example.com`,
    password: 'SecurePassword123!'
  };

  let authToken;


  it('should register a new user successfully (POST /api/v1/auth/register)', async () => {
    const response = await request(app)
        .post('/api/v1/auth/register')
      .send(testUser);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('message', 'User registered successfully!');
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('username', testUser.username);
  });


  it('should fail to register the same user twice (Duplicate constraint 23505)', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser); // Sending the same details

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Username or email already exists.');
  });


  it('should login successfully with valid credentials (POST /api/v1/auth/login)', async () => {
    const response = await request(app)
        .post('/api/v1/auth/login')
      .send({
        username: testUser.username,
        password: testUser.password
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('username', testUser.username);
    
    // Save token for authenticated route tests
    authToken = response.body.token;
  });


  it('should fail login with incorrect password', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: testUser.username,
        password: 'WrongPassword999!'
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'Invalid username or password.');
  });


  it('should fetch current user profile with a valid token (GET /api/v1/users/me)', async () => {
    const response = await request(app)
        .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('username', testUser.username);
    expect(response.body).toHaveProperty('email', testUser.email);
  });

});