import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chanakyaToUnicode, nonDevanagari } from '../scripts/ingest/lib/chanakya.js';

// Glyph strings exactly as pdf.js extracts them from the PDF, with the expected Devanagari.
const CASES = [
  ['\u2211\u00a7\u00cb\u00cc\u00c3\u00c3\u00ca', 'कीर्तिता'],
  ['\u00f8\u00c3\u00c8\u00cf\ufb02\u2021\u00ca\u00e0\u201a\u201eUd\u00ca\u00c1\u00e1\u00ca', 'चतुर्विंशत्सहस्राणि'],
  ['\u2211\u00a7\u00c1S \u00a2\u25ca\u00c1p\u00c3\u02dc', 'कस्मिंश्चित्'],
  ['\u2022\u201e\u00a2U', 'अहं'],
  ['\u00aa\u00c1\u25cac\u00ff\u00ca\u00c1\u25ca', 'गमिष्यामि'],
  ['\u00c1\u00ac\u00c3\u00ce\u00ce\u00e1\u00ca\u00ca\u00a2', 'पितॄणां'],
  ['\u2211\u00a7\u00c3\u00c8Z', 'कर्तुं'],
  ['\u00fc\u00d9c\u2206\u00d4U', 'श्रेष्ठ'],
  ['\ufb02\u0178\uf8ff \u00c1\u0178\ufb02\u00e0S\u00ff\u00ca\u00c1\u25ca \u00ff\u00d5\u00ca \u00c1\u00ac\u00c3\u00c8\u00aa\u00b8\u00ce\u201e\uf8ff\u00d4', 'वने निवत्स्यामि यथा पितुर्गृहे'],
  ['\u00c1\ufb02\u2211\u00a7\u00cb\u00e1\u00caZ \u00ac\u00c1\u00c3\u00c3\u00a2 \u0152\u00cec\u2248\u00d4U\u02dc\u02dc\ufb02\u00ca \u201e\u00d4\u0178\u00cd\u25ca\u00ca\u0178\u02dc \u2211\u02dd\u00a7\u00d9\u0153\u25ca\u00cd\u00c1\u00eb\u00b8\u00bf\u00c3\u2014H 19H', 'विकीर्णं पतितं दृष्ट्वा हनूमान् क्रोधमूर्च्छितः॥ १९॥'],
];

test('converts Chanakya glyph runs to Unicode Devanagari', () => {
  for (const [raw, expected] of CASES) {
    assert.equal(chanakyaToUnicode(raw), expected);
  }
});

test('leaves no legacy glyphs behind', () => {
  for (const [raw] of CASES) {
    assert.equal(nonDevanagari(chanakyaToUnicode(raw)), '');
  }
});
