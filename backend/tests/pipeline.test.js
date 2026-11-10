import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRagPipeline } from '../src/services/rag/pipeline.js';

const passage = (id, extra = {}) => ({
  id,
  kanda: 'Ayodhya Kanda',
  sarga: 1,
  verse_start: 1,
  verse_end: 2,
  sarga_summary: 'summary',
  sanskrit: 'धर्मः',
  translation: 'translation (1)',
  ranks: { dense: 1 },
  ...extra,
});

const config = { ENABLE_HYDE: true, ENABLE_CRAG: true, CONTEXT_TOP_K: 3 };

function fakeLlm(reply = 'guidance') {
  const calls = [];
  return {
    calls,
    async *stream(args) {
      calls.push(args);
      yield reply;
    },
  };
}

function collect() {
  const events = [];
  return { events, emit: (event, data) => events.push({ event, ...data }) };
}

test('generates from relevant passages without a corrective search', async () => {
  const llm = fakeLlm();
  let searches = 0;
  const run = createRagPipeline({
    llm,
    config,
    transform: async () => ({ searchQuery: 'duty', keywords: ['duty'], hypotheticalPassage: 'hyde' }),
    search: async () => (searches++, [passage('a'), passage('b')]),
    rerankPassages: async ({ passages }) => ({ passages, reranked: false }),
    grade: async ({ passages }) => ({
      decision: 'correct',
      kept: passages.map((p) => ({ ...p, verdict: 'relevant' })),
    }),
  });
  const { events, emit } = collect();
  const result = await run({ message: 'my problem', emit });

  assert.equal(searches, 1);
  assert.equal(result.grounded, true);
  assert.equal(result.corrected, false);
  assert.equal(result.answer, 'guidance');
  assert.deepEqual(
    events.filter((e) => e.event === 'stage').map((e) => e.stage),
    ['transform', 'retrieve', 'rerank', 'grade', 'generate'],
  );
  assert.match(llm.calls[0].messages.at(-1).content, /judged relevant/);
});

test('runs a step-back search when the first retrieval is graded poorly', async () => {
  const llm = fakeLlm();
  const stepBackFlags = [];
  let round = 0;
  const run = createRagPipeline({
    llm,
    config,
    transform: async ({ stepBack }) => (stepBackFlags.push(stepBack), { searchQuery: 'q', keywords: [], hypotheticalPassage: '' }),
    search: async () => (round++ === 0 ? [passage('a')] : [passage('a'), passage('b')]),
    rerankPassages: async ({ passages }) => ({ passages, reranked: false }),
    grade: async ({ passages }) =>
      passages[0].id === 'a'
        ? { decision: 'incorrect', kept: [] }
        : { decision: 'ambiguous', kept: passages.map((p) => ({ ...p, verdict: 'relevant' })) },
  });
  const result = await run({ message: 'my problem' });

  assert.deepEqual(stepBackFlags, [false, true]);
  assert.equal(result.corrected, true);
  assert.equal(result.grounded, true);
  assert.deepEqual(result.sources.map((s) => s.id), ['b']);
});

test('answers with the ungrounded notice when nothing relevant is found', async () => {
  const llm = fakeLlm();
  const run = createRagPipeline({
    llm,
    config,
    transform: async () => ({ searchQuery: 'q', keywords: [], hypotheticalPassage: '' }),
    search: async () => [passage('a')],
    rerankPassages: async ({ passages }) => ({ passages, reranked: false }),
    grade: async () => ({ decision: 'incorrect', kept: [] }),
  });
  const result = await run({ message: 'my problem' });

  assert.equal(result.grounded, false);
  assert.deepEqual(result.sources, []);
  assert.match(llm.calls[0].messages.at(-1).content, /Follow rule 2/);
});

test('still retrieves when query transformation fails', async () => {
  const llm = fakeLlm();
  let searched;
  const run = createRagPipeline({
    llm,
    config: { ...config, ENABLE_CRAG: false },
    transform: async () => {
      throw new Error('llm down');
    },
    search: async (q) => ((searched = q), [passage('a')]),
    rerankPassages: async ({ passages }) => ({ passages, reranked: false }),
  });
  const result = await run({ message: 'my problem' });

  assert.equal(searched.query, 'my problem');
  assert.equal(result.sources.length, 1);
});
