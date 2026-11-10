import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { llmClient } from '../llm/llm.client.js';
import { transformQuery } from '../retrieval/queryTransform.js';
import { hybridSearch } from '../retrieval/hybridSearch.js';
import { rerank } from '../retrieval/reranker.js';
import { gradePassages } from '../retrieval/grader.js';
import { GUIDE_SYSTEM_PROMPT, buildUserTurn } from './prompts.js';

const toSource = (p) => ({
  id: p.id,
  kanda: p.kanda,
  sarga: p.sarga,
  verseStart: p.verse_start,
  verseEnd: p.verse_end,
  sargaSummary: p.sarga_summary,
  sanskrit: p.sanskrit,
  translation: p.translation,
  verdict: p.verdict,
  retrievers: Object.keys(p.ranks || {}),
});

/**
 * The RAG pipeline, as a factory so every stage can be swapped in tests:
 *
 *   transform (rewrite + HyDE) → hybrid search (dense + sparse, RRF) → rerank
 *     → grade (CRAG) → [corrective step-back search] → grounded generation
 *
 * `emit(event, data)` reports progress; the controller forwards it as Server-Sent Events.
 */
export function createRagPipeline(deps = {}) {
  const {
    llm = llmClient,
    transform = transformQuery,
    search = hybridSearch,
    rerankPassages = rerank,
    grade = gradePassages,
    config = env,
  } = deps;

  async function retrieve({ message, history, stepBack, signal, emit }) {
    emit('stage', { stage: stepBack ? 'correct' : 'transform' });
    let query = { searchQuery: message, keywords: [], hypotheticalPassage: '' };
    if (config.ENABLE_HYDE) {
      try {
        query = await transform({ message, history, stepBack, signal, llm });
      } catch (err) {
        if (signal?.aborted) throw err;
        logger.warn({ err: err.message }, 'query transformation failed; searching with the raw message');
      }
    }

    emit('stage', { stage: 'retrieve', query: query.searchQuery, keywords: query.keywords });
    const candidates = await search({
      query: query.searchQuery,
      keywords: query.keywords,
      hypotheticalPassage: query.hypotheticalPassage,
    });

    emit('stage', { stage: 'rerank', candidates: candidates.length });
    const { passages } = await rerankPassages({ query: `${message}\n${query.searchQuery}`, passages: candidates, signal });
    return passages;
  }

  async function gradeSafely({ message, passages, signal }) {
    try {
      return await grade({ message, passages, signal, llm });
    } catch (err) {
      if (signal?.aborted) throw err;
      // If grading is unavailable, trust the reranker rather than fail the request.
      logger.warn({ err: err.message }, 'grading failed; keeping reranked passages');
      return { decision: 'correct', graded: passages, kept: passages };
    }
  }

  return async function run({ message, history = [], signal, emit = () => {} }) {
    let passages = await retrieve({ message, history, stepBack: false, signal, emit });
    let grounded = passages.length > 0;
    let corrected = false;

    if (config.ENABLE_CRAG && passages.length) {
      emit('stage', { stage: 'grade', passages: passages.length });
      let result = await gradeSafely({ message, passages, signal });

      if (result.decision !== 'correct') {
        // Corrective step: step-back query, search again, grade only what is new.
        corrected = true;
        const seen = new Set(passages.map((p) => p.id));
        const fresh = (await retrieve({ message, history, stepBack: true, signal, emit })).filter((p) => !seen.has(p.id));
        if (fresh.length) {
          emit('stage', { stage: 'grade', passages: fresh.length });
          const second = await gradeSafely({ message, passages: fresh, signal });
          const kept = [...result.kept, ...second.kept];
          const relevant = kept.filter((p) => p.verdict === 'relevant');
          result = {
            decision: relevant.length >= 1 ? 'correct' : kept.length ? 'ambiguous' : 'incorrect',
            kept: [...relevant, ...kept.filter((p) => p.verdict !== 'relevant')],
          };
        }
      }
      grounded = result.decision === 'correct';
      passages = result.kept;
    }

    passages = passages.slice(0, config.CONTEXT_TOP_K);
    emit('sources', { sources: passages.map(toSource), grounded, corrected });

    emit('stage', { stage: 'generate' });
    let answer = '';
    const messages = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: buildUserTurn({ message, passages, grounded }) },
    ];
    for await (const delta of llm.stream({ system: GUIDE_SYSTEM_PROMPT, messages, signal })) {
      answer += delta;
      emit('token', { text: delta });
    }
    return { answer, sources: passages.map(toSource), grounded, corrected };
  };
}

export const runRagPipeline = createRagPipeline();
