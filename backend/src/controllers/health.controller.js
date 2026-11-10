import { env } from '../config/env.js';
import { chunkRepository } from '../repositories/chunk.repository.js';

export async function health(_req, res) {
  const chunks = await chunkRepository.count();
  res.json({
    status: chunks > 0 ? 'ok' : 'empty_index',
    chunks,
    llmConfigured: Boolean(env.LLM_API_KEY),
    reranker: env.COHERE_API_KEY ? 'cohere' : 'none',
  });
}
