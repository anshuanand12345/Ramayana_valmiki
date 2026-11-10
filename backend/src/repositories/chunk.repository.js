import { getDb } from '../db/client.js';
import { CHUNKS, TEXT_INDEX, VECTOR_INDEX } from '../db/indexes.js';

const collection = async () => (await getDb()).collection(CHUNKS);

// Search results carry the passage, not the vector or the keyword-search copy of the text.
const SHAPE = [{ $set: { id: '$_id' } }, { $unset: ['_id', 'embedding', 'search_text'] }];

export const chunkRepository = {
  /** Dense retrieval: Atlas Vector Search (HNSW, cosine). */
  async searchByEmbedding(embedding, limit) {
    return (await collection())
      .aggregate([
        {
          $vectorSearch: {
            index: VECTOR_INDEX,
            path: 'embedding',
            queryVector: Array.from(embedding),
            numCandidates: limit * 10,
            limit,
          },
        },
        { $set: { score: { $meta: 'vectorSearchScore' } } },
        ...SHAPE,
      ])
      .toArray();
  },

  /** Sparse retrieval: Atlas Search (BM25). Terms in the query are OR-ed. */
  async searchByKeywords(keywordQuery, limit) {
    if (!keywordQuery) return [];
    return (await collection())
      .aggregate([
        { $search: { index: TEXT_INDEX, text: { query: keywordQuery, path: 'search_text' } } },
        { $limit: limit },
        { $set: { score: { $meta: 'searchScore' } } },
        ...SHAPE,
      ])
      .toArray();
  },

  async count() {
    return (await collection()).estimatedDocumentCount();
  },

  async existingIds() {
    const docs = await (await collection()).find({}, { projection: { _id: 1 } }).toArray();
    return new Set(docs.map((d) => d._id));
  },

  /** Refresh stored text without touching embeddings (after a parser fix that leaves the embedded text unchanged). */
  async updateTextMany(chunks) {
    if (!chunks.length) return;
    await (await collection()).bulkWrite(
      chunks.map(({ id, sanskrit, translation, sarga_summary, search_text }) => ({
        updateOne: { filter: { _id: id }, update: { $set: { sanskrit, translation, sarga_summary, search_text } } },
      })),
      { ordered: false },
    );
  },

  async upsertMany(chunks) {
    if (!chunks.length) return;
    await (await collection()).bulkWrite(
      chunks.map(({ id, ...doc }) => ({
        replaceOne: { filter: { _id: id }, replacement: { ...doc, embedding: Array.from(doc.embedding) }, upsert: true },
      })),
      { ordered: false },
    );
  },
};
