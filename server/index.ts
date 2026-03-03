import express from 'express';
import cors from 'cors';
import databaseApi from './database-api';
import { checkDbHealth } from './db';
import { getPortfolioSummary } from './portfolio';
import { logger } from './logger';

const app = express();
const PORT = Number(process.env.PORT || process.env.API_PORT || 3001);

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(express.json());

if (allowedOrigins.length > 0) {
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin not allowed: ${origin}`));
    },
    credentials: true,
  }));
}

app.use('/api/database-proxy', databaseApi);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'option-control-hub-api' });
});

app.get('/api/health/db', async (_req, res) => {
  try {
    const health = await checkDbHealth();
    res.json({ status: 'ok', db: 'connected', latencyMs: health.latencyMs });
  } catch (error) {
    const err = error as Error & { code?: string };
    logger.error('Database healthcheck failed', {
      event: 'db_healthcheck_failed',
      code: err.code,
      message: err.message,
    });
    res.status(503).json({ status: 'error', db: 'unreachable', error: err.message });
  }
});

app.get('/api/portfolio/summary', async (req, res) => {
  try {
    const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : undefined;
    const summary = await getPortfolioSummary({ accountId });
    res.json({ success: true, summary });
  } catch (error) {
    const err = error as Error & { code?: string };
    logger.error('Portfolio summary query failed', {
      event: 'portfolio_summary_failed',
      code: err.code,
      message: err.message,
    });
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info('API server started', { port: PORT });
});

export default app;
