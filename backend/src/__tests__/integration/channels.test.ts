import request from 'supertest';
import { createTestApp } from '../testApp';
import pool from '../../database/db';
import { hashPassword } from '../../utils/password';

const app = createTestApp();

describe('Channel API Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let workspaceId: string;

  beforeAll(async () => {
    try {
      // Create test user
      const passwordHash = await hashPassword('Password123!');
      const userResult = await pool.query(
        `INSERT INTO users (email, username, password_hash, display_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['channeltest@test.com', 'channeltest', passwordHash, 'Channel Test User']
      );
      userId = userResult.rows[0].id;

      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'channeltest@test.com',
          password: 'Password123!',
        });

      authToken = loginResponse.body.token;

      // Create workspace
      const workspaceResult = await pool.query(
        `INSERT INTO workspaces (name, slug, owner_id)
         VALUES ($1, $2, $3)
         RETURNING id`,
        ['Channel Test Workspace', 'channel-test-workspace', userId]
      );
      workspaceId = workspaceResult.rows[0].id;

      // Add user to workspace
      await pool.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role)
         VALUES ($1, $2, $3)`,
        [workspaceId, userId, 'admin']
      );
    } catch (error) {
      console.log('Setup error (expected if tables do not exist):', error);
    }
  });

  afterAll(async () => {
    try {
      await pool.query('DELETE FROM channel_members WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM channels WHERE workspace_id = $1', [workspaceId]);
      await pool.query('DELETE FROM workspace_members WHERE workspace_id = $1', [workspaceId]);
      await pool.query('DELETE FROM workspaces WHERE id = $1', [workspaceId]);
      await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    } catch (error) {
      console.log('Cleanup error:', error);
    }
  });

  describe('POST /api/channels/:workspaceId', () => {
    it('should create a public channel with valid data', async () => {
      const response = await request(app)
        .post(`/api/channels/${workspaceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'test-channel',
          description: 'Test channel description',
          isPrivate: false,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('test-channel');
      expect(response.body.isPrivate).toBe(false);
    });

    it('should create a private channel', async () => {
      const response = await request(app)
        .post(`/api/channels/${workspaceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'private-channel',
          description: 'Private channel',
          isPrivate: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.isPrivate).toBe(true);
    });

    it('should reject channel creation without authentication', async () => {
      const response = await request(app)
        .post(`/api/channels/${workspaceId}`)
        .send({
          name: 'test-channel',
          isPrivate: false,
        });

      expect(response.status).toBe(401);
    });

    it('should reject invalid channel name', async () => {
      const response = await request(app)
        .post(`/api/channels/${workspaceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'a',
          isPrivate: false,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/channels/:workspaceId', () => {
    beforeAll(async () => {
      // Create some test channels
      for (let i = 0; i < 3; i++) {
        const channelResult = await pool.query(
          `INSERT INTO channels (workspace_id, name, is_private, created_by)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [workspaceId, `channel-${i}`, false, userId]
        );

        // Add user to channel
        await pool.query(
          `INSERT INTO channel_members (channel_id, user_id)
           VALUES ($1, $2)`,
          [channelResult.rows[0].id, userId]
        );
      }
    });

    it('should retrieve all channels in workspace', async () => {
      const response = await request(app)
        .get(`/api/channels/${workspaceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/channels/${workspaceId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/channels/:channelId/join', () => {
    let channelId: string;

    beforeEach(async () => {
      const result = await pool.query(
        `INSERT INTO channels (workspace_id, name, is_private, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [workspaceId, 'join-test', false, userId]
      );
      channelId = result.rows[0].id;
    });

    it('should allow user to join public channel', async () => {
      const response = await request(app)
        .post(`/api/channels/${channelId}/join`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should reject join without authentication', async () => {
      const response = await request(app)
        .post(`/api/channels/${channelId}/join`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/channels/:channelId/leave', () => {
    let channelId: string;

    beforeEach(async () => {
      const result = await pool.query(
        `INSERT INTO channels (workspace_id, name, is_private, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [workspaceId, 'leave-test', false, userId]
      );
      channelId = result.rows[0].id;

      // Add user to channel
      await pool.query(
        `INSERT INTO channel_members (channel_id, user_id)
         VALUES ($1, $2)`,
        [channelId, userId]
      );
    });

    it('should allow user to leave channel', async () => {
      const response = await request(app)
        .post(`/api/channels/${channelId}/leave`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should reject leave without authentication', async () => {
      const response = await request(app)
        .post(`/api/channels/${channelId}/leave`);

      expect(response.status).toBe(401);
    });
  });
});