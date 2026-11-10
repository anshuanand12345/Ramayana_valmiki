/**
 * Step 1 — Extract positioned text runs from the Gita Press PDF.
 *
 * The PDF was typeset in PageMaker with legacy (non-Unicode) fonts:
 *   - Chanakya*  → Sanskrit shlokas (glyph codes, decoded later by lib/chanakya.js)
 *   - Nalanda*   → English translation with custom diacritics (lib/nalanda.js)
 * So we keep the font of every run; it is the only reliable script signal.
 *
 * Output: data/processed/pages.jsonl — one JSON object per page:
 *   { page, runs: [{ f: 'sa'|'en'|'other', b: bold, x, y, w, h, s }] }
 */
import fs from 'node:fs';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PATHS } from './lib/paths.js';

function classifyFont(name = '') {
  if (/chanakya/i.test(name)) return 'sa';
  if (/nalanda/i.test(name)) return 'en';
  return 'other';
}

async function main() {
  if (!fs.existsSync(PATHS.pdf)) {
    throw new Error(`PDF not found at ${PATHS.pdf}. Place Valmiki_Ramayana.pdf in backend/data/raw/.`);
  }
  fs.mkdirSync(path.dirname(PATHS.pages), { recursive: true });

  const data = new Uint8Array(fs.readFileSync(PATHS.pdf));
  const doc = await getDocument({ data, useSystemFonts: true, verbosity: 0 }).promise;
  const out = fs.createWriteStream(PATHS.pages);

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    // Loading the operator list resolves font objects so we can read real font names.
    await page.getOperatorList();
    const tc = await page.getTextContent({ disableNormalization: true });

    const fontNames = {};
    const runs = [];
    const seen = new Set();
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      if (!(it.fontName in fontNames)) {
        try {
          fontNames[it.fontName] = page.commonObjs.get(it.fontName).name || '';
        } catch {
          fontNames[it.fontName] = '';
        }
      }
      const name = fontNames[it.fontName];
      const x = Math.round(it.transform[4] * 10) / 10;
      const y = Math.round(it.transform[5] * 10) / 10;
      // Fake-bold headings are drawn several times at sub-point offsets; keep one copy.
      const key = `${Math.round(x)}|${Math.round(y)}|${it.str}`;
      if (seen.has(key)) continue;
      seen.add(key);
      runs.push({
        f: classifyFont(name),
        b: /bold/i.test(name) ? 1 : 0,
        x,
        y,
        w: Math.round(it.width * 10) / 10,
        h: Math.round(it.height * 10) / 10,
        s: it.str,
      });
    }
    out.write(JSON.stringify({ page: p, runs }) + '\n');
    page.cleanup();
    if (p % 200 === 0 || p === doc.numPages) console.log(`extracted ${p}/${doc.numPages} pages`);
  }

  await new Promise((resolve) => out.end(resolve));
  console.log(`wrote ${PATHS.pages}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
