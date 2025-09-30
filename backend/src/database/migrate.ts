import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

async function migrate() {
  // Use TEST_DATABASE_URL if available, otherwise use DATABASE_URL
  const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  try {
    console.log('Starting database migration...');
    console.log(`Database: ${databaseUrl?.split('@')[1] || 'unknown'}`);

    const schemaSQL = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');

    await pool.query(schemaSQL);

    console.log('Database migration completed successfully!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
}

migrate();