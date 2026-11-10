import { llmClient } from '../llm/llm.client.js';

const SYSTEM = `You prepare search queries for a retrieval system over an English translation of the Valmiki Ramayana (with Sanskrit shlokas).
A user describes a modern life problem. The epic never mentions modern things (jobs, exams, social media), so translate the problem into the human themes and Ramayana situations where the same dilemma appears.

Return a JSON object with exactly these keys:
- "search_query": one sentence restating the problem as its underlying theme, in the vocabulary of the epic (duty, grief, exile, anger, loyalty, fate, counsel, vows...).
- "keywords": 6-10 single English words likely to appear in a translation of relevant passages (emotions, virtues, characters, events). No modern terms.
- "hypothetical_passage": 3-4 sentences written in the style of a formal English translation of the Valmiki Ramayana, in which a character gives counsel that would answer this problem. This is used only for embedding similarity (HyDE). Do not include verse numbers or Sanskrit.`;

const STEP_BACK_SYSTEM = `${SYSTEM}

A first search with a narrower query returned passages that were not relevant. Step back: identify the broader, more universal principle of dharma behind the problem, and pick different episodes and keywords than an obvious first attempt would.`;

/**
 * Query rewriting + HyDE in one LLM call.
 * Falls back to the raw message if the model is unavailable, so retrieval still works.
 */
export async function transformQuery({ message, history = [], stepBack = false, signal, llm = llmClient }) {
  const context = history.length
    ? `Earlier in the conversation:\n${history.map((m) => `${m.role}: ${m.content.slice(0, 400)}`).join('\n')}\n\n`
    : '';
  const out = await llm.json({
    system: stepBack ? STEP_BACK_SYSTEM : SYSTEM,
    user: `${context}User's problem:\n${message}`,
    signal,
  });
  return {
    searchQuery: typeof out.search_query === 'string' && out.search_query.trim() ? out.search_query.trim() : message,
    keywords: Array.isArray(out.keywords) ? out.keywords.filter((k) => typeof k === 'string').slice(0, 12) : [],
    hypotheticalPassage: typeof out.hypothetical_passage === 'string' ? out.hypothetical_passage.trim() : '',
  };
}
