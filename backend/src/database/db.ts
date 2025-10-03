import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Extend global type
declare global {
  var serverStarted: boolean | undefined;
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('⚠️ Unexpected error on idle PostgreSQL client:', err);
  // Don't exit process - log error and let pool handle reconnection
  // Only exit if this is a critical startup error
  if (!global.serverStarted) {
    console.error('❌ Database connection failed during startup');
    process.exit(1);
  }
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
};

export default pool;