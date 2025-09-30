import request from 'supertest';
import { createTestApp } from '../testApp';
import pool from '../../database/db';
import { hashPassword } from '../../utils/password';

const app = createTestApp();

describe('Message API Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let workspaceId: string;
  let channelId: string;

  beforeAll(async () => {
    try {
      // Create test user
      const passwordHash = await hashPassword('Password123!');
      const userResult = await pool.query(
        `INSERT INTO users (email, username, password_hash, display_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['messagetest@test.com', 'messagetest', passwordHash, 'Message Test User']
      );
      userId = userResult.rows[0].id;

      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'messagetest@test.com',
          password: 'Password123!',
        });

      authToken = loginResponse.body.token;

      // Create workspace
      const workspaceResult = await pool.query(
        `INSERT INTO workspaces (name, slug, owner_id)
         VALUES ($1, $2, $3)
         RETURNING id`,
        ['Test Workspace', 'test-workspace', userId]
      );
      workspaceId = workspaceResult.rows[0].id;

      // Add user to workspace
      await pool.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role)
         VALUES ($1, $2, $3)`,
        [workspaceId, userId, 'admin']
      );

      // Create channel
      const channelResult = await pool.query(
        `INSERT INTO channels (workspace_id, name, slug, is_private, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [workspaceId, 'general', 'general', false, userId]
      );
      channelId = channelResult.rows[0].id;

      // Add user to channel
      await pool.query(
        `INSERT INTO channel_members (channel_id, user_id)
         VALUES ($1, $2)`,
        [channelId, userId]
      );
    } catch (error) {
      console.log('Setup error (expected if tables do not exist):', error);
    }
  });

  afterAll(async () => {
    try {
      await pool.query('DELETE FROM messages WHERE workspace_id = $1', [workspaceId]);
      await pool.query('DELETE FROM channel_members WHERE channel_id = $1', [channelId]);
      await pool.query('DELETE FROM channels WHERE id = $1', [channelId]);
      await pool.query('DELETE FROM workspace_members WHERE workspace_id = $1', [workspaceId]);
      await pool.query('DELETE FROM workspaces WHERE id = $1', [workspaceId]);
      await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    } catch (error) {
      console.log('Cleanup error:', error);
    }
  });

  describe('POST /api/messages/:workspaceId/channels/:channelId', () => {
    it('should send a message with valid auth and membership', async () => {
      const response = await request(app)
        .post(`/api/messages/${workspaceId}/channels/${channelId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test message content',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe('Test message content');
      expect(response.body.userId).toBe(userId);
      expect(response.body.channelId).toBe(channelId);
    });

    it('should reject message without authentication', async () => {
      const response = await request(app)
        .post(`/api/messages/${workspaceId}/channels/${channelId}`)
        .send({
          content: 'Test message',
        });

      expect(response.status).toBe(401);
    });

    it('should reject empty message', async () => {
      const response = await request(app)
        .post(`/api/messages/${workspaceId}/channels/${channelId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '',
        });

      expect(response.status).toBe(400);
    });

    it('should reject message that is too long', async () => {
      const longContent = 'a'.repeat(10001);

      const response = await request(app)
        .post(`/api/messages/${workspaceId}/channels/${channelId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: longContent,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/messages/:workspaceId/channels/:channelId', () => {
    beforeAll(async () => {
      // Create some test messages
      for (let i = 0; i < 5; i++) {
        await pool.query(
          `INSERT INTO messages (workspace_id, channel_id, user_id, content)
           VALUES ($1, $2, $3, $4)`,
          [workspaceId, channelId, userId, `Test message ${i + 1}`]
        );
      }
    });

    it('should retrieve messages for channel', async () => {
      const response = await request(app)
        .get(`/api/messages/${workspaceId}/channels/${channelId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/messages/${workspaceId}/channels/${channelId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/messages/:messageId', () => {
    let messageId: string;

    beforeEach(async () => {
      const result = await pool.query(
        `INSERT INTO messages (workspace_id, channel_id, user_id, content)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [workspaceId, channelId, userId, 'Original content']
      );
      messageId = result.rows[0].id;
    });

    it('should update message with valid auth', async () => {
      const response = await request(app)
        .put(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Updated content',
        });

      expect(response.status).toBe(200);
      expect(response.body.content).toBe('Updated content');
      expect(response.body.isEdited).toBe(true);
    });

    it('should reject update without authentication', async () => {
      const response = await request(app)
        .put(`/api/messages/${messageId}`)
        .send({
          content: 'Updated content',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/messages/:messageId', () => {
    let messageId: string;

    beforeEach(async () => {
      const result = await pool.query(
        `INSERT INTO messages (workspace_id, channel_id, user_id, content)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [workspaceId, channelId, userId, 'Message to delete']
      );
      messageId = result.rows[0].id;
    });

    it('should delete message with valid auth', async () => {
      const response = await request(app)
        .delete(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should reject delete without authentication', async () => {
      const response = await request(app)
        .delete(`/api/messages/${messageId}`);

      expect(response.status).toBe(401);
    });
  });
});