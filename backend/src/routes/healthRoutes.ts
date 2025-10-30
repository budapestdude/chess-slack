import express from 'express';
import pool from '../database/db';
import logger from '../utils/logger';

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    
    // Check if migrations table exists and get applied migrations
    const migrationsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'schema_migrations'
      ) as migrations_table_exists
    `);
    
    let appliedMigrations: string[] = [];
    if (migrationsResult.rows[0].migrations_table_exists) {
      const migrations = await pool.query(
        'SELECT migration_name FROM schema_migrations ORDER BY migration_name'
      );
      appliedMigrations = migrations.rows.map(r => r.migration_name);
    }
    
    // Check if project_id column exists in agent_tasks
    const columnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'agent_tasks' AND column_name = 'project_id'
      ) as project_id_exists
    `);
    
    res.json({
      status: 'healthy',
      database: 'connected',
      migrations: {
        tableExists: migrationsResult.rows[0].migrations_table_exists,
        applied: appliedMigrations,
        count: appliedMigrations.length
      },
      tables: {
        agent_tasks_has_project_id: columnCheck.rows[0].project_id_exists
      }
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
