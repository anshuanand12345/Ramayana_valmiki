import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reciprocalRankFusion, toKeywordQuery } from '../src/services/retrieval/fusion.js';

test('RRF rewards documents found by several retrievers', () => {
  const fused = reciprocalRankFusion([
    { name: 'dense', rows: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] },
    { name: 'sparse', rows: [{ id: 'b' }, { id: 'd' }] },
  ]);
  assert.deepEqual(
    fused.map((r) => r.id),
    ['b', 'a', 'd', 'c'],
  );
  assert.deepEqual(fused[0].ranks, { dense: 2, sparse: 1 });
});

test('RRF respects the limit', () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));
  assert.equal(reciprocalRankFusion([{ name: 'dense', rows }], { limit: 3 }).length, 3);
});

test('toKeywordQuery keeps distinct meaningful terms', () => {
  assert.equal(toKeywordQuery("I feel grief; Rāma's duty & exile!"), 'grief rama duty exile');
  assert.equal(toKeywordQuery('the of and'), '');
});
