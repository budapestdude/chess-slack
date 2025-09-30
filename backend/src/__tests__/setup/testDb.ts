import { Pool, PoolClient } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

let testPool: Pool | null = null;

/**
 * Get or create the test database pool
 */
export const getTestPool = (): Pool => {
  if (!testPool) {
    testPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/chessslack_test',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    testPool.on('error', (err) => {
      console.error('Unexpected error on idle test client', err);
    });
  }
  return testPool;
};

/**
 * Initialize the test database by running the schema
 */
export const initTestDatabase = async (): Promise<void> => {
  const pool = getTestPool();

  try {
    const schemaSQL = readFileSync(join(__dirname, '../../database/schema.sql'), 'utf-8');
    await pool.query(schemaSQL);
    console.log('Test database initialized successfully');
  } catch (error: any) {
    // If database doesn't exist, provide helpful error message
    if (error.code === '3D000') {
      throw new Error(
        'Test database does not exist. Please create it first:\n' +
        'createdb chessslack_test\n' +
        'Or run: npm run migrate:test'
      );
    }
    throw error;
  }
};

/**
 * Clean all data from test database tables
 */
export const cleanTestDatabase = async (): Promise<void> => {
  const pool = getTestPool();

  try {
    // Delete in reverse order of dependencies
    await pool.query('DELETE FROM message_reactions');
    await pool.query('DELETE FROM pinned_messages');
    await pool.query('DELETE FROM attachments');
    await pool.query('DELETE FROM files');
    await pool.query('DELETE FROM messages');
    await pool.query('DELETE FROM chess_positions');
    await pool.query('DELETE FROM chess_games');
    await pool.query('DELETE FROM tournament_players');
    await pool.query('DELETE FROM tournaments');
    await pool.query('DELETE FROM chess_sites');
    await pool.query('DELETE FROM player_ratings');
    await pool.query('DELETE FROM dm_group_members');
    await pool.query('DELETE FROM dm_groups');
    await pool.query('DELETE FROM channel_members');
    await pool.query('DELETE FROM channels');
    await pool.query('DELETE FROM workspace_members');
    await pool.query('DELETE FROM workspaces');
    await pool.query('DELETE FROM sessions');
    await pool.query('DELETE FROM user_presence');
    await pool.query('DELETE FROM notifications');
    await pool.query('DELETE FROM users');
  } catch (error) {
    console.error('Error cleaning test database:', error);
    throw error;
  }
};

/**
 * Drop and recreate all tables
 */
export const resetTestDatabase = async (): Promise<void> => {
  const pool = getTestPool();

  try {
    // Drop all tables
    await pool.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);

    // Reinitialize with schema
    await initTestDatabase();
  } catch (error) {
    console.error('Error resetting test database:', error);
    throw error;
  }
};

/**
 * Close the test database connection pool
 */
export const closeTestDatabase = async (): Promise<void> => {
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
};

/**
 * Execute a query within a transaction and rollback after
 * Useful for tests that need to verify database state without persisting
 */
export const withTransaction = async (
  callback: (client: PoolClient) => Promise<void>
): Promise<void> => {
  const pool = getTestPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await callback(client);
    await client.query('ROLLBACK');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Check if the test database exists and is accessible
 */
export const checkTestDatabase = async (): Promise<boolean> => {
  const pool = getTestPool();

  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error: any) {
    if (error.code === '3D000') {
      return false;
    }
    throw error;
  }
};

export default {
  getTestPool,
  initTestDatabase,
  cleanTestDatabase,
  resetTestDatabase,
  closeTestDatabase,
  withTransaction,
  checkTestDatabase,
};