import OpenAI from 'openai';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';

let client;
function getClient() {
  if (!env.LLM_API_KEY) throw new AppError(503, 'LLM_NOT_CONFIGURED', 'LLM_API_KEY is not set on the server.');
  client ??= new OpenAI({ baseURL: env.LLM_BASE_URL, apiKey: env.LLM_API_KEY, maxRetries: 2, timeout: 60_000 });
  return client;
}

/** Models sometimes wrap JSON in prose or code fences; take the outermost object. */
export function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object in model output');
  return JSON.parse(text.slice(start, end + 1));
}

export const llmClient = {
  /** Single-shot call that must return a JSON object. Used for query transformation and grading. */
  async json({ system, user, model = env.LLM_FAST_MODEL, signal }) {
    const res = await getClient().chat.completions.create(
      {
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      },
      { signal },
    );
    return extractJson(res.choices[0]?.message?.content || '');
  },

  /** Streaming completion; yields text deltas. */
  async *stream({ system, messages, model = env.LLM_MODEL, signal }) {
    const stream = await getClient().chat.completions.create(
      {
        model,
        temperature: 0.4,
        stream: true,
        messages: [{ role: 'system', content: system }, ...messages],
      },
      { signal },
    );
    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  },
};
