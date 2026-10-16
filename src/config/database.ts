import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

function buildPoolConfig(): PoolConfig {
  // DATABASE_URL takes precedence when provided; otherwise use discrete values.
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }

  return {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };
}

export const pool = new Pool(buildPoolConfig());

// Surface idle-client errors instead of crashing the process silently.
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

/**
 * Runs a lightweight query to confirm the database is reachable.
 * Resolves to true when the connection is healthy, false otherwise.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT 1 AS ok');
    return result.rows[0]?.ok === 1;
  } catch (error) {
    console.error('Database health check failed', error);
    return false;
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
