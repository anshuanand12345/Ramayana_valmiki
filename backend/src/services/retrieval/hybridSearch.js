import { env } from '../../config/env.js';
import { chunkRepository } from '../../repositories/chunk.repository.js';
import { embeddingService } from '../embedding/embedding.service.js';
import { reciprocalRankFusion, toKeywordQuery } from './fusion.js';

/**
 * Hybrid retrieval: dense (query + HyDE passage) and sparse (keywords) searches
 * run in parallel and are merged with Reciprocal Rank Fusion.
 */
export async function hybridSearch(
  { query, keywords = [], hypotheticalPassage = '' },
  { repository = chunkRepository, embedder = embeddingService, candidates = env.RETRIEVAL_CANDIDATES } = {},
) {
  const [queryVector] = await embedder.embedQueries([query]);
  // The HyDE passage is embedded as a *document*: it should land near real passages, not near questions.
  const hydeVector = hypotheticalPassage ? (await embedder.embedDocuments([hypotheticalPassage]))[0] : null;
  const keywordQuery = toKeywordQuery([query, ...keywords].join(' '));

  const [dense, hyde, sparse] = await Promise.all([
    repository.searchByEmbedding(queryVector, candidates),
    hydeVector ? repository.searchByEmbedding(hydeVector, candidates) : [],
    repository.searchByKeywords(keywordQuery, candidates),
  ]);

  return reciprocalRankFusion(
    [
      { name: 'dense', rows: dense },
      { name: 'hyde', rows: hyde },
      { name: 'sparse', rows: sparse },
    ],
    { limit: candidates },
  );
}
