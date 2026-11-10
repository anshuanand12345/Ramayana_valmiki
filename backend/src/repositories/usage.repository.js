import { getDb } from '../db/client.js';

export const USAGE = 'usage';

const collection = async () => (await getDb()).collection(USAGE);
const today = () => new Date().toISOString().slice(0, 10);

export const usageRepository = {
  /**
   * Count one request against today's allowance for `key`, atomically.
   * The filter only matches while the counter is under the limit; once it is not,
   * the upsert tries to insert a second document with the same _id and fails —
   * that duplicate-key error is the "limit reached" signal.
   */
  async consume(key, limit) {
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000); // TTL index removes old counters
    try {
      const doc = await (await collection()).findOneAndUpdate(
        { _id: `${today()}:${key}`, count: { $lt: limit } },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
        { upsert: true, returnDocument: 'after' },
      );
      return { allowed: true, remaining: limit - doc.count };
    } catch (err) {
      if (err.code === 11000) return { allowed: false, remaining: 0 };
      throw err;
    }
  },
};
