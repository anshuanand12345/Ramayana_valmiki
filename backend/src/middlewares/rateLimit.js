import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

// Each chat request fans out into several LLM calls, so protect the free-tier quota.
export const chatRateLimit = rateLimit({
  windowMs: 60_000,
  limit: env.RATE_LIMIT_PER_MINUTE,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please pause for a minute and try again.' } },
});
