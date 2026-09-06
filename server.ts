import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes';
import { db } from './server/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize MySQL database connection
  try {
    await db.init();
    console.log('[TapEmpire] MySQL database engine initialized successfully.');
  } catch (err: any) {
    console.error('[TapEmpire] Warning: Database connection error on startup:', err.message);
  }

  // Standard middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Real Database-Aware Health Check Endpoint
  app.get('/api/health', async (req, res) => {
    let dbStatus = 'disconnected';
    let latencyMs = 0;
    try {
      const start = Date.now();
      const pool = db.getPool();
      await pool.query('SELECT 1');
      latencyMs = Date.now() - start;
      dbStatus = 'connected';
    } catch (err: any) {
      dbStatus = `error: ${err.message}`;
    }

    res.json({
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      database: dbStatus,
      database_latency_ms: latencyMs,
      timestamp: new Date().toISOString(),
      service: 'TapEmpire Telegram Tap-to-Earn Backend Engine',
    });
  });

  // Mount API routes
  app.use('/api', apiRouter);

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TapEmpire] Full-stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
