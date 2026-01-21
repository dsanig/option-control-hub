import express from 'express';
import cors from 'cors';
import databaseApi from './database-api';

const app = express();
const PORT = process.env.API_PORT || 3001;

// Enable CORS for local development
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8080', 'http://127.0.0.1:5173'],
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
