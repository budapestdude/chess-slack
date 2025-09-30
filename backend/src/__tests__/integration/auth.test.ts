import request from 'supertest';
import { createTestApp } from '../testApp';
import pool from '../../database/db';
import { hashPassword } from '../../utils/password';

const app = createTestApp();

describe('Auth API Integration Tests', () => {
  // Clean up test data after each test
  afterEach(async () => {
    try {
      await pool.query('DELETE FROM sessions');
      await pool.query('DELETE FROM users WHERE email LIKE \'%@test.com\'');
    } catch (error) {
      console.log('Cleanup error (expected if tables do not exist):', error);
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          username: 'newuser',
          password: 'Password123!',
          displayName: 'New User',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe('newuser@test.com');
      expect(response.body.user.username).toBe('newuser');
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalidemail',
          username: 'testuser',
          password: 'Password123!',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          username: 'testuser',
          password: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with short username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          username: 'ab',
          password: 'Password123!',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'duplicate@test.com',
        username: 'user1',
        password: 'Password123!',
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...userData,
          username: 'user2',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/already exists/i);
    });

    it('should reject duplicate username', async () => {
      const userData = {
        email: 'user1@test.com',
        username: 'duplicateuser',
        password: 'Password123!',
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Try to register with same username
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...userData,
          email: 'user2@test.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/already exists/i);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const passwordHash = await hashPassword('Password123!');
      await pool.query(
        `INSERT INTO users (email, username, password_hash, display_name)
         VALUES ($1, $2, $3, $4)`,
        ['loginuser@test.com', 'loginuser', passwordHash, 'Login User']
      );
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'loginuser@test.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe('loginuser@test.com');
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'loginuser@test.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/invalid/i);
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/invalid/i);
    });

    it('should reject login with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalidemail',
          password: 'Password123!',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject login for disabled account', async () => {
      // Disable the user account
      await pool.query(
        'UPDATE users SET is_active = false WHERE email = $1',
        ['loginuser@test.com']
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'loginuser@test.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/disabled/i);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      // Register and get token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'logoutuser@test.com',
          username: 'logoutuser',
          password: 'Password123!',
        });

      const { token } = registerResponse.body;

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/logged out/i);
    });

    it('should handle logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      // Register and get token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'meuser@test.com',
          username: 'meuser',
          password: 'Password123!',
        });

      const { token } = registerResponse.body;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('meuser@test.com');
      expect(response.body.username).toBe('meuser');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token_here');

      expect(response.status).toBe(401);
    });
  });
});