import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { router } from './routes/index.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // behind Render's proxy; needed for per-client rate limiting
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()) }));
  app.use(express.json({ limit: '64kb' }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/v1/health' } }));

  app.use('/api/v1', router);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
