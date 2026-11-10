/**
 * Step 3 — Embed chunks and load them into MongoDB Atlas (vector + full-text search indexes).
 * Resumable: chunks already in the database are skipped, so it is safe to re-run.
 * `npm run ingest:load -- --update-text` also rewrites the stored text of existing chunks (no re-embedding).
 */
import fs from 'node:fs';
import { PATHS } from './lib/paths.js';
import { closeDb } from '../../src/db/client.js';
import { ensureIndexes, waitForSearchIndexes } from '../../src/db/indexes.js';
import { chunkRepository } from '../../src/repositories/chunk.repository.js';
import { embeddingService } from '../../src/services/embedding/embedding.service.js';

const BATCH = 32;

// Contextual chunk header: where the passage sits in the epic is part of what gets embedded.
const embeddingText = (c) => `${c.kanda}, Sarga ${c.sarga}: ${c.sarga_summary}\n${c.translation}`;

async function main() {
  if (!fs.existsSync(PATHS.chunks)) throw new Error('Run `npm run ingest:parse` first.');
  const chunks = fs.readFileSync(PATHS.chunks, 'utf8').trim().split('\n').map(JSON.parse);

  await ensureIndexes();
  const existing = await chunkRepository.existingIds();
  const todo = chunks.filter((c) => !existing.has(c.id));
  console.log(`${chunks.length} chunks, ${existing.size} already loaded, ${todo.length} to embed`);

  if (process.argv.includes('--update-text')) {
    const stale = chunks.filter((c) => existing.has(c.id));
    for (let i = 0; i < stale.length; i += 500) await chunkRepository.updateTextMany(stale.slice(i, i + 500));
    console.log(`refreshed text of ${stale.length} existing chunks`);
  }

  const started = Date.now();
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const embeddings = await embeddingService.embedDocuments(batch.map(embeddingText));
    await chunkRepository.upsertMany(batch.map((c, j) => ({ ...c, embedding: embeddings[j] })));
    const done = Math.min(i + BATCH, todo.length);
    if (done % (BATCH * 10) === 0 || done === todo.length) {
      console.log(`loaded ${done}/${todo.length} (${Math.round((Date.now() - started) / 1000)}s)`);
    }
  }

  console.log(`${await chunkRepository.count()} chunks in the database; waiting for search indexes to finish building…`);
  await waitForSearchIndexes();
  console.log('done — search indexes ready');
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
