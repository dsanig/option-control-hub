import { Pool, PoolConfig } from 'pg';
import { logger } from './logger';

function parseSslConfig() {
  const sslMode = process.env.PGSSLMODE?.toLowerCase();
  const dbSsl = process.env.DB_SSL?.toLowerCase();

  if (dbSsl === 'true' || sslMode === 'require') {
    return { rejectUnauthorized: false };
  }

  if (dbSsl === 'false' || sslMode === 'disable') {
    return false;
  }

  return undefined;
}

function getPoolConfig(): PoolConfig {
  const ssl = parseSslConfig();
  const baseConfig: PoolConfig = {
    max: Number(process.env.PGPOOL_MAX ?? 10),
    idleTimeoutMillis: Number(process.env.PGPOOL_IDLE_TIMEOUT_MS ?? 30_000),
    connectionTimeoutMillis: Number(process.env.PGPOOL_CONNECTION_TIMEOUT_MS ?? 10_000),
    ssl,
  };

  if (process.env.DATABASE_URL) {
    return {
      ...baseConfig,
      connectionString: process.env.DATABASE_URL,
    };
  }

  return {
    ...baseConfig,
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
  };
}

let poolSingleton: Pool | undefined;

export function getDbPool() {
  if (poolSingleton) {
    return poolSingleton;
  }

  poolSingleton = new Pool(getPoolConfig());
  poolSingleton.on('error', (err) => {
    logger.error('Postgres pool error', {
      event: 'pg_pool_error',
      code: err.code,
      name: err.name,
      message: err.message,
    });
  });

  return poolSingleton;
}

export async function query<T = unknown>(text: string, values?: unknown[]) {
  return getDbPool().query<T>(text, values);
}

export async function checkDbHealth() {
  const started = Date.now();
  await query('SELECT 1');
  return { latencyMs: Date.now() - started };
}
