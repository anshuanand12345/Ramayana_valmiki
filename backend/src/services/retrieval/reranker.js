import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

const COHERE_URL = 'https://api.cohere.com/v2/rerank';

/**
 * Cross-encoder reranking (Cohere Rerank). A cross-encoder reads query and passage
 * together, so it is far more precise than the bi-encoder used for first-stage recall.
 * Without COHERE_API_KEY — or if the call fails — the fused order is kept.
 */
export async function rerank({ query, passages, topN = env.RERANK_TOP_N, signal }) {
  if (!env.COHERE_API_KEY || passages.length <= 1) {
    return { passages: passages.slice(0, topN), reranked: false };
  }
  try {
    const res = await fetch(COHERE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.COHERE_API_KEY}` },
      body: JSON.stringify({
        model: env.RERANK_MODEL,
        query,
        documents: passages.map((p) => `${p.sarga_summary}\n${p.translation}`),
        top_n: topN,
      }),
      signal,
    });
    if (!res.ok) throw new Error(`Cohere rerank ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const { results } = await res.json();
    return {
      passages: results.map((r) => ({ ...passages[r.index], rerank_score: r.relevance_score })),
      reranked: true,
    };
  } catch (err) {
    if (signal?.aborted) throw err;
    logger.warn({ err: err.message }, 'rerank failed; using fused order');
    return { passages: passages.slice(0, topN), reranked: false };
  }
}
