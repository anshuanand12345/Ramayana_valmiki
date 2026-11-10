import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

// BGE models are trained with this instruction on the query side only.
const BGE_QUERY_PREFIX = 'Represent this sentence for searching relevant passages: ';

function createLocalEmbedder() {
  let extractorPromise;
  const load = () =>
    (extractorPromise ??= import('@huggingface/transformers').then(({ pipeline }) => {
      logger.info({ model: env.EMBEDDING_MODEL }, 'loading local embedding model');
      return pipeline('feature-extraction', env.EMBEDDING_MODEL, { dtype: 'q8' });
    }));

  const embed = async (texts) => {
    const extractor = await load();
    const output = await extractor(texts, { pooling: 'cls', normalize: true });
    return output.tolist();
  };

  const isBge = /bge/i.test(env.EMBEDDING_MODEL);
  return {
    warmup: load,
    embedDocuments: embed,
    embedQueries: (queries) => embed(isBge ? queries.map((q) => BGE_QUERY_PREFIX + q) : queries),
  };
}

function createApiEmbedder() {
  let clientPromise;
  const client = () =>
    (clientPromise ??= import('openai').then(
      ({ default: OpenAI }) =>
        new OpenAI({
          baseURL: env.EMBEDDING_BASE_URL || env.LLM_BASE_URL,
          apiKey: env.EMBEDDING_API_KEY || env.LLM_API_KEY,
        }),
    ));

  const embed = async (texts) => {
    const res = await (await client()).embeddings.create({
      model: env.EMBEDDING_MODEL,
      input: texts,
      dimensions: env.EMBEDDING_DIM,
    });
    return res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  };

  return { warmup: async () => {}, embedDocuments: embed, embedQueries: embed };
}

export const embeddingService = env.EMBEDDING_PROVIDER === 'api' ? createApiEmbedder() : createLocalEmbedder();
