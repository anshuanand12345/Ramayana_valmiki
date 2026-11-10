/**
 * Reciprocal Rank Fusion: score(d) = Σ 1 / (k + rank_i(d)) over every ranked list.
 * Rank-based, so dense cosine scores and sparse BM25 scores never need calibrating.
 */
export function reciprocalRankFusion(rankedLists, { k = 60, limit = 30 } = {}) {
  const fused = new Map();
  for (const { name, rows } of rankedLists) {
    rows.forEach((row, i) => {
      const entry = fused.get(row.id) || { ...row, score: 0, ranks: {} };
      entry.score += 1 / (k + i + 1);
      entry.ranks[name] = i + 1;
      fused.set(row.id, entry);
    });
  }
  return [...fused.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

const STOPWORDS = new Set(
  'a an and are as at be but by for from had has have he her his i in is it its me my of on or our she so that the their them they this to was we were what when who why will with you your am do does did not no how can could should would feel feeling very really just about been being than then too'.split(' '),
);

/** Reduce free text to distinct search terms: "my grief, duty to father" → "grief duty father". */
export function toKeywordQuery(text, maxTerms = 16) {
  const terms = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
  return [...new Set(terms)].slice(0, maxTerms).join(' ');
}
