import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { migrationService } from './services/migration.service';
import routes from './routes';
import { errorHandler } from './middleware/error-handler';

async function main() {
  // Connect to MongoDB
  await connectDatabase();
  
  // Run DB migrations
  await migrationService.runMigrations();

  const app = express();

  // ── Middleware ───────────────────────────────────────────
  app.use(
    cors({
      origin: '*', // Allow extension origin; tighten in production
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'x-api-key'],
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Request logging ─────────────────────────────────────
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });

  // ── Routes ──────────────────────────────────────────────
  app.use('/api', routes);

  // ── Error handler ───────────────────────────────────────
  app.use(errorHandler);

  // ── Start server ────────────────────────────────────────
  app.listen(env.port, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║   Meet Scraper Backend                       ║
║   Port: ${env.port}                              ║
║   MongoDB: ${env.mongodbUri.substring(0, 30)}...  ║
║   Environment: ${env.nodeEnv}                    ║
╚══════════════════════════════════════════════╝
    `);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
