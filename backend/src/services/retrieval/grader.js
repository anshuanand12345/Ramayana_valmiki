import { llmClient } from '../llm/llm.client.js';

const SYSTEM = `You are a strict relevance grader for a retrieval system over the Valmiki Ramayana.
Given a user's life problem and numbered passages, judge whether each passage contains teaching, counsel, or an episode that genuinely speaks to the problem.

- "relevant": the passage directly offers counsel or an example that applies to the problem.
- "partial": thematically related, but only loosely applicable.
- "irrelevant": unrelated narration (battle description, genealogy, scenery) or a different theme.

Return a JSON object: {"grades": [{"n": <passage number>, "verdict": "relevant" | "partial" | "irrelevant"}]} with one entry per passage.`;

const VERDICTS = new Set(['relevant', 'partial', 'irrelevant']);

/**
 * Corrective RAG — retrieval evaluator.
 * Grades each passage and classifies the retrieval as a whole:
 *   correct   → enough relevant passages; generate from them
 *   ambiguous → some signal; keep it and run a corrective search for more
 *   incorrect → nothing usable; discard and run a corrective search
 */
export async function gradePassages({ message, passages, minRelevant = 2, signal, llm = llmClient }) {
  const listing = passages
    .map((p, i) => `[${i + 1}] ${p.kanda}, Sarga ${p.sarga} — ${p.sarga_summary}\n${p.translation.slice(0, 1200)}`)
    .join('\n\n');
  const out = await llm.json({ system: SYSTEM, user: `User's problem:\n${message}\n\nPassages:\n${listing}`, signal });

  const verdictByIndex = new Map();
  for (const g of Array.isArray(out.grades) ? out.grades : []) {
    if (Number.isInteger(g?.n) && VERDICTS.has(g?.verdict)) verdictByIndex.set(g.n - 1, g.verdict);
  }
  // A passage the grader skipped is treated as partial rather than silently dropped.
  const graded = passages.map((p, i) => ({ ...p, verdict: verdictByIndex.get(i) || 'partial' }));

  const relevant = graded.filter((p) => p.verdict === 'relevant');
  const partial = graded.filter((p) => p.verdict === 'partial');
  let decision = 'incorrect';
  if (relevant.length >= minRelevant) decision = 'correct';
  else if (relevant.length || partial.length) decision = 'ambiguous';

  return { decision, graded, kept: [...relevant, ...partial] };
}
