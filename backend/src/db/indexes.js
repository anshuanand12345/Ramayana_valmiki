import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { closeDb, getDb } from './client.js';
import { USAGE } from '../repositories/usage.repository.js';

export const CHUNKS = 'chunks';
export const VECTOR_INDEX = 'chunks_vector';
export const TEXT_INDEX = 'chunks_text';

const SEARCH_INDEXES = [
  {
    // Dense retrieval: approximate nearest neighbour (HNSW) over cosine similarity.
    name: VECTOR_INDEX,
    type: 'vectorSearch',
    definition: {
      fields: [{ type: 'vector', path: 'embedding', numDimensions: env.EMBEDDING_DIM, similarity: 'cosine' }],
    },
  },
  {
    // Sparse retrieval: Atlas Search (Lucene BM25) with English stemming.
    name: TEXT_INDEX,
    type: 'search',
    definition: {
      mappings: { dynamic: false, fields: { search_text: { type: 'string', analyzer: 'lucene.english' } } },
    },
  },
];

/** Create the collection and its Atlas Search indexes if missing. Idempotent; index builds finish in the background. */
export async function ensureIndexes() {
  const db = await getDb();
  const existing = await db.listCollections({ name: CHUNKS }).toArray();
  if (!existing.length) await db.createCollection(CHUNKS);
  const chunks = db.collection(CHUNKS);

  await chunks.createIndex({ kanda_index: 1, sarga: 1, verse_start: 1 });
  // Daily usage counters delete themselves once expired.
  await db.collection(USAGE).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  const present = new Set((await chunks.listSearchIndexes().toArray()).map((i) => i.name));
  for (const index of SEARCH_INDEXES) {
    if (present.has(index.name)) continue;
    await chunks.createSearchIndex(index);
    logger.info({ index: index.name }, 'search index created');
  }
}

/** Search indexes are built asynchronously; resolve once every one of them can serve queries. */
export async function waitForSearchIndexes({ timeoutMs = 300_000 } = {}) {
  const chunks = (await getDb()).collection(CHUNKS);
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const indexes = await chunks.listSearchIndexes().toArray();
    const pending = SEARCH_INDEXES.filter((want) => !indexes.find((i) => i.name === want.name)?.queryable);
    if (!pending.length) return;
    if (Date.now() > deadline) throw new Error(`Search indexes not ready: ${pending.map((i) => i.name).join(', ')}`);
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
}

// Run directly: `npm run db:indexes`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  ensureIndexes()
    .then(waitForSearchIndexes)
    .then(() => logger.info('search indexes ready'))
    .then(closeDb)
    .catch((err) => {
      logger.error({ err }, 'index setup failed');
      process.exit(1);
    });
}
