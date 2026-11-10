import { logger } from '../config/logger.js';
import { toClientError } from '../middlewares/errorHandler.js';
import { runRagPipeline } from '../services/rag/pipeline.js';
import { transformQuery } from '../services/retrieval/queryTransform.js';
import { hybridSearch } from '../services/retrieval/hybridSearch.js';

/**
 * POST /api/v1/chat — runs the RAG pipeline and streams it as Server-Sent Events:
 *   stage   {stage, …}            pipeline progress
 *   sources {sources, grounded}   passages the answer is grounded in
 *   token   {text}                answer text deltas
 *   done    {}                    stream finished
 *   error   {code, message}
 */
export async function chat(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  // Stop paying for LLM tokens the moment the client disconnects.
  const controller = new AbortController();
  res.on('close', () => controller.abort());

  try {
    await runRagPipeline({ ...req.body, signal: controller.signal, emit: send });
    send('done', {});
  } catch (err) {
    if (!controller.signal.aborted) {
      const { status, code, message } = toClientError(err);
      if (status >= 500) logger.error({ err }, 'chat pipeline failed');
      send('error', { code, message });
    }
  } finally {
    res.end();
  }
}

/** POST /api/v1/search — retrieval only (no generation). Handy for inspecting what the retriever finds. */
export async function search(req, res) {
  const { query, limit } = req.body;
  // HyDE needs the LLM; without a key this endpoint still demonstrates plain hybrid search.
  const transformed = await transformQuery({ message: query }).catch(() => null);
  const results = await hybridSearch({
    query: transformed?.searchQuery || query,
    keywords: transformed?.keywords || [],
    hypotheticalPassage: transformed?.hypotheticalPassage || '',
  });
  res.json({
    query: transformed?.searchQuery || query,
    hyde: Boolean(transformed?.hypotheticalPassage),
    results: results.slice(0, limit).map((r) => ({
      id: r.id,
      kanda: r.kanda,
      sarga: r.sarga,
      verseStart: r.verse_start,
      verseEnd: r.verse_end,
      sargaSummary: r.sarga_summary,
      sanskrit: r.sanskrit,
      translation: r.translation,
      rrfScore: Number(r.score.toFixed(5)),
      ranks: r.ranks,
    })),
  });
}
