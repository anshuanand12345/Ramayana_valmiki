import { logger } from '../config/logger.js';
import { AppError } from '../utils/errors.js';

export function notFound(_req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', 'Route not found.'));
}

export function toClientError(err) {
  if (err instanceof AppError) return { status: err.status, code: err.code, message: err.message };
  // Upstream LLM errors (openai SDK) carry an HTTP status.
  if (err?.status === 429) return { status: 429, code: 'LLM_RATE_LIMITED', message: 'The language model is busy. Please try again in a minute.' };
  if (err?.type === 'entity.parse.failed') return { status: 400, code: 'BAD_JSON', message: 'Request body is not valid JSON.' };
  return { status: 500, code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' };
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const { status, code, message } = toClientError(err);
  if (status >= 500) logger.error({ err, path: req.path }, 'request failed');
  res.status(status).json({ error: { code, message } });
}
