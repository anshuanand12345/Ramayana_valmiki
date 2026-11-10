import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { usageRepository } from '../repositories/usage.repository.js';
import { AppError } from '../utils/errors.js';

// Visitors are anonymous, so "a user" is an IP address — stored only as a hash.
const visitorKey = (ip) => createHash('sha256').update(`ramayana-guide:${ip}`).digest('hex').slice(0, 32);

/**
 * Daily allowance per visitor, plus a site-wide ceiling so a burst of traffic
 * (or many IPs) cannot run up the LLM bill. Counters live in MongoDB, so they
 * survive restarts and free-tier sleep — unlike the in-memory per-minute limiter.
 */
export function createDailyQuota({
  usage = usageRepository,
  perVisitor = env.DAILY_QUESTIONS_PER_VISITOR,
  siteWide = env.DAILY_QUESTIONS_SITE_WIDE,
} = {}) {
  return async function dailyQuota(req, res, next) {
    try {
      const visitor = await usage.consume(`visitor:${visitorKey(req.ip)}`, perVisitor);
      if (!visitor.allowed) {
        throw new AppError(429, 'DAILY_LIMIT', `You have used today's ${perVisitor} questions. Please come back tomorrow.`);
      }
      const site = await usage.consume('site', siteWide);
      if (!site.allowed) {
        throw new AppError(429, 'SITE_LIMIT', 'The guide has reached its limit for today. Please come back tomorrow.');
      }
      res.set('X-Questions-Remaining', String(visitor.remaining));
      next();
    } catch (err) {
      next(err);
    }
  };
}

export const dailyQuota = createDailyQuota();
