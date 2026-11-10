import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { closeDb } from './db/client.js';
import { ensureIndexes } from './db/indexes.js';
import { embeddingService } from './services/embedding/embedding.service.js';

async function main() {
  await ensureIndexes();
  const server = createApp().listen(env.PORT, () => logger.info({ port: env.PORT }, 'Ramayana Guide API listening'));

  // Load the embedding model in the background so the first question is not slow.
  embeddingService.warmup().catch((err) => logger.error({ err }, 'embedding model failed to load'));

  const shutdown = (signal) => {
    logger.info({ signal }, 'shutting down');
    server.close(async () => {
      await closeDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'failed to start');
  process.exit(1);
});
