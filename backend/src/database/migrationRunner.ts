import pool from './db';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

interface Migration {
  filename: string;
  number: number;
}

async function runMigrations() {
  try {
    logger.info('🔄 Starting database migrations...');

    // Create migrations tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of applied migrations
    const appliedResult = await pool.query(
      'SELECT migration_name FROM schema_migrations ORDER BY migration_name'
    );
    const appliedMigrations = new Set(appliedResult.rows.map((r) => r.migration_name));

    // Get list of migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .map(f => ({
        filename: f,
        number: parseInt(f.split('_')[0], 10)
      }))
      .sort((a, b) => a.number - b.number);

    let migrationsRun = 0;

    // Run pending migrations
    for (const migration of files) {
      if (appliedMigrations.has(migration.filename)) {
        logger.debug(`✓ Migration ${migration.filename} already applied`);
        continue;
      }

      logger.info(`🔄 Running migration: ${migration.filename}`);
      
      const filePath = path.join(migrationsDir, migration.filename);
      const sql = fs.readFileSync(filePath, 'utf8');

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
          [migration.filename]
        );
        await client.query('COMMIT');
        logger.info(`✅ Migration ${migration.filename} completed successfully`);
        migrationsRun++;
      } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`❌ Migration ${migration.filename} failed:`, error);
        throw error;
      } finally {
        client.release();
      }
    }

    if (migrationsRun === 0) {
      logger.info('✅ All migrations up to date');
    } else {
      logger.info(`✅ Successfully ran ${migrationsRun} migration(s)`);
    }

    return true;
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    throw error;
  }
}

export default runMigrations;
