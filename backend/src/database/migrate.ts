import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function runMigrations() {
  console.log('Starting database migrations...');

  const migrationsDir = path.join(__dirname, 'migrations');

  // Check if migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    console.error(`Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  // Get all migration files sorted by name
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  console.log(`Found ${migrationFiles.length} migration files`);

  // Create migrations tracking table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Check which migrations have already been applied
  const { rows: appliedMigrations } = await pool.query(
    'SELECT migration_name FROM schema_migrations ORDER BY migration_name'
  );

  const appliedMigrationNames = new Set(appliedMigrations.map(row => row.migration_name));

  let appliedCount = 0;
  let skippedCount = 0;

  for (const file of migrationFiles) {
    if (appliedMigrationNames.has(file)) {
      console.log(`⏭️  Skipping already applied migration: ${file}`);
      skippedCount++;
      continue;
    }

    console.log(`🔄 Applying migration: ${file}`);

    const migrationPath = path.join(migrationsDir, file);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    const client = await pool.connect();

    try {
      // Start transaction
      await client.query('BEGIN');

      // Run migration
      await client.query(migrationSQL);

      // Record migration
      await client.query(
        'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
        [file]
      );

      // Commit transaction
      await client.query('COMMIT');

      console.log(`✅ Successfully applied: ${file}`);
      appliedCount++;
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      console.error(`❌ Error applying migration ${file}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   Applied: ${appliedCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Total: ${migrationFiles.length}`);
  console.log('\n✅ All migrations completed successfully!');
}

// Run migrations and exit
runMigrations()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    pool.end();
    process.exit(1);
  });
