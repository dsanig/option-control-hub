import express from 'express';
import cors from 'cors';
import databaseApi from './database-api';

const app = express();
const PORT = process.env.API_PORT || 3001;

const isPrivateHost = (hostname: string) => {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
    return true;
  }

  const ipv4Match = hostname.match(/^(\d{1,3})(?:\.(\d{1,3})){3}$/);
  if (ipv4Match) {
    const [a, b] = hostname.split('.').map(Number);
    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }

  return hostname.endsWith('.local');
};

const getAllowedOrigins = () => {
  const rawOrigins = process.env.ALLOWED_ORIGINS;
  if (!rawOrigins) {
    return [];
  }

  return rawOrigins
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
};

const allowedOrigins = getAllowedOrigins();

const isAllowedOrigin = (origin: string) => {
  if (allowedOrigins.length === 0) {
    return false;
  }

  try {
    const parsed = new URL(origin);
    return allowedOrigins.includes(origin) || allowedOrigins.includes(parsed.hostname);
  } catch {
    return allowedOrigins.includes(origin);
  }
};

// Enable CORS for local development
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    try {
      const { hostname } = new URL(origin);
      callback(null, isPrivateHost(hostname) || isAllowedOrigin(origin));
    } catch (error) {
      callback(error as Error);
    }
  },
  credentials: true,
}));

// Mount database API routes
app.use('/api/database-proxy', databaseApi);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', mode: 'local' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Local database API server running at http://localhost:${PORT}`);
  console.log(`   All database connections stay on your local machine.`);
  console.log(`   No data is sent to the cloud.\n`);
});

export default app;
