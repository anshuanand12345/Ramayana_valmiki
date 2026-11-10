import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDailyQuota } from '../src/middlewares/dailyQuota.js';

function fakeUsage() {
  const counts = new Map();
  return {
    counts,
    async consume(key, limit) {
      const count = counts.get(key) || 0;
      if (count >= limit) return { allowed: false, remaining: 0 };
      counts.set(key, count + 1);
      return { allowed: true, remaining: limit - count - 1 };
    },
  };
}

async function call(quota, ip) {
  const headers = {};
  let error;
  await quota({ ip }, { set: (k, v) => (headers[k] = v) }, (err) => (error = err));
  return { error, headers };
}

test('allows up to the per-visitor limit, then rejects that visitor only', async () => {
  const quota = createDailyQuota({ usage: fakeUsage(), perVisitor: 2, siteWide: 100 });

  assert.equal((await call(quota, '1.1.1.1')).headers['X-Questions-Remaining'], '1');
  assert.equal((await call(quota, '1.1.1.1')).error, undefined);
  const third = await call(quota, '1.1.1.1');
  assert.equal(third.error.status, 429);
  assert.equal(third.error.code, 'DAILY_LIMIT');

  assert.equal((await call(quota, '2.2.2.2')).error, undefined);
});

test('rejects everyone once the site-wide ceiling is reached', async () => {
  const quota = createDailyQuota({ usage: fakeUsage(), perVisitor: 5, siteWide: 2 });

  await call(quota, '1.1.1.1');
  await call(quota, '2.2.2.2');
  assert.equal((await call(quota, '3.3.3.3')).error.code, 'SITE_LIMIT');
});

test('does not store raw IP addresses', async () => {
  const usage = fakeUsage();
  await call(createDailyQuota({ usage, perVisitor: 5, siteWide: 100 }), '203.0.113.7');
  assert.ok([...usage.counts.keys()].every((key) => !key.includes('203.0.113.7')));
});
