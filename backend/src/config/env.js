import 'dotenv/config';
import { z } from 'zod';

const bool = z
  .enum(['true', 'false'])
  .default('true')
  .transform((v) => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8080),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.string().default('info'),

  // MongoDB Atlas (free M0 tier works): Atlas Vector Search + Atlas Search.
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB: z.string().default('ramayana_guide'),

  // Any OpenAI-compatible chat endpoint (Gemini, Groq, OpenRouter, …).
  LLM_BASE_URL: z.string().default('https://generativelanguage.googleapis.com/v1beta/openai/'),
  LLM_API_KEY: z.string().default(''),
  LLM_MODEL: z.string().default('gemini-2.5-flash'),
  // Cheaper/faster model for query transformation and grading; defaults to LLM_MODEL.
  LLM_FAST_MODEL: z.string().optional(),

  // "local" runs a small ONNX model in-process (free, no key); "api" calls an OpenAI-compatible endpoint.
  EMBEDDING_PROVIDER: z.enum(['local', 'api']).default('local'),
  EMBEDDING_MODEL: z.string().default('Xenova/bge-small-en-v1.5'),
  EMBEDDING_DIM: z.coerce.number().default(384),
  EMBEDDING_BASE_URL: z.string().optional(),
  EMBEDDING_API_KEY: z.string().optional(),

  // Optional cross-encoder reranker. Without a key the fused (RRF) order is used.
  COHERE_API_KEY: z.string().optional(),
  RERANK_MODEL: z.string().default('rerank-v3.5'),

  RETRIEVAL_CANDIDATES: z.coerce.number().default(30), // per retriever, before fusion
  RERANK_TOP_N: z.coerce.number().default(8), // passages graded by CRAG
  CONTEXT_TOP_K: z.coerce.number().default(5), // passages sent to the generator
  ENABLE_HYDE: bool,
  ENABLE_CRAG: bool,

  RATE_LIMIT_PER_MINUTE: z.coerce.number().default(12),
  // Each question costs LLM tokens: cap them per visitor (by IP) and for the whole site, per day.
  DAILY_QUESTIONS_PER_VISITOR: z.coerce.number().default(5),
  DAILY_QUESTIONS_SITE_WIDE: z.coerce.number().default(200),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  LLM_FAST_MODEL: parsed.data.LLM_FAST_MODEL || parsed.data.LLM_MODEL,
  isProd: parsed.data.NODE_ENV === 'production',
};
