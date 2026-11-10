/**
 * Step 2 — Turn positioned runs into structured, verse-aligned chunks.
 *
 * Page anatomy (Gita Press edition):
 *   - running header                       → dropped
 *   - full-width lines: canto headings, canto summaries, colophons
 *   - two-column body: Sanskrit shloka lines (Chanakya) followed by their
 *     English translation (Nalanda) ending in the verse number "(12)" / "(12-13)"
 *
 * Chunking is structure-aware: a chunk is a run of consecutive verse units from
 * one sarga, never splitting a shloka from its translation.
 *
 * Output: data/processed/chunks.jsonl
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { PATHS } from './lib/paths.js';
import { chanakyaToUnicode } from './lib/chanakya.js';
import { nalandaToUnicode, foldDiacritics } from './lib/nalanda.js';

const HEADER_Y = 656; // running header sits above this baseline
const GUTTER = [217, 227]; // blank strip between the two columns
const COLUMN_SPLIT = 222;
const TARGET_CHARS = 900; // English characters per chunk
const MAX_UNITS = 6;

const KANDAS = [
  { index: 1, name: 'Bala Kanda', match: /b[aā]lak[aā][nṇ][dḍ]a/i },
  { index: 2, name: 'Ayodhya Kanda', match: /ayodhy[aā]k[aā][nṇ][dḍ]a/i },
  { index: 3, name: 'Aranya Kanda', match: /ara[nṇ]yak[aā][nṇ][dḍ]a/i },
  { index: 4, name: 'Kishkindha Kanda', match: /ki[sṣ]kindh[aā]k[aā][nṇ][dḍ]a/i },
  { index: 5, name: 'Sundara Kanda', match: /sundarak[aā][nṇ][dḍ]a/i },
  { index: 6, name: 'Yuddha Kanda', match: /yuddhak[aā][nṇ][dḍ]a/i },
  { index: 7, name: 'Uttara Kanda', match: /uttarak[aā][nṇ][dḍ]a/i },
];

const VERSE_NO_RE = /\((\d+)(?:\s*[-–—]\s*(\d+))?\)\s*[’”'"]*\s*$/;
const CANTO_RE = /^Canto\s+([IVXLCDM]+)\b/;

function romanToInt(roman) {
  const val = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < roman.length; i++) {
    const cur = val[roman[i]];
    total += cur < (val[roman[i + 1]] || 0) ? -cur : cur;
  }
  return total;
}

function isFullWidthRun(r) {
  if (r.x < GUTTER[0] && r.x + r.w > GUTTER[1]) return true;
  if (r.f === 'en') return r.h !== 11 && r.h !== 10; // body text is 11pt
  return !r.b || r.h >= 16; // body shlokas are bold 14pt; colophons/headings are not
}

function joinRuns(runs) {
  runs.sort((a, b) => a.x - b.x);
  let text = '';
  let end = null;
  for (const r of runs) {
    if (end !== null && r.x - end > 1) text += ' ';
    text += r.s;
    end = r.x + r.w;
  }
  return text;
}

function toLines(runs, full) {
  const sorted = [...runs].sort((a, b) => b.y - a.y);
  const lines = [];
  for (const r of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - r.y) <= 2 && last.f === r.f) last.runs.push(r);
    else lines.push({ y: r.y, f: r.f, runs: [r] });
  }
  return lines.map((l) => ({
    y: l.y,
    f: l.f,
    full,
    h: Math.max(...l.runs.map((r) => r.h)),
    raw: joinRuns(l.runs),
  }));
}

/** Reading order: full-width lines split the page into bands; each band reads left column, then right. */
function pageToLines(runs) {
  // Fake-bold headings are the same text drawn again at a sub-point offset; keep one copy.
  const body = runs.filter(
    (r, i) =>
      r.y <= HEADER_Y &&
      r.f !== 'other' &&
      !runs.slice(0, i).some((p) => p.s === r.s && Math.abs(p.x - r.x) < 1.5 && Math.abs(p.y - r.y) < 1.5),
  );
  const fullYs = body.filter(isFullWidthRun).map((r) => r.y);
  const isFull = (r) => fullYs.some((y) => Math.abs(y - r.y) <= 1.5);

  const fullLines = toLines(body.filter(isFull), true);
  const columnRuns = body.filter((r) => !isFull(r));

  const out = [];
  let upper = Infinity;
  for (const boundary of [...fullLines, null]) {
    const lower = boundary ? boundary.y : -Infinity;
    const band = columnRuns.filter((r) => r.y < upper && r.y > lower);
    out.push(...toLines(band.filter((r) => r.x < COLUMN_SPLIT), false));
    out.push(...toLines(band.filter((r) => r.x >= COLUMN_SPLIT), false));
    if (boundary) out.push(boundary);
    upper = lower;
  }
  return out;
}

function joinProse(lines) {
  let text = '';
  for (const line of lines) {
    if (text.endsWith('-') && /^[a-z]/.test(line)) text = text.slice(0, -1) + line;
    else text += (text ? ' ' : '') + line;
  }
  return text.replace(/\s+/g, ' ').trim();
}

function joinShloka(lines) {
  let text = '';
  for (const line of lines) {
    if (text.endsWith('-')) text = text.slice(0, -1) + line;
    else text += (text ? '\n' : '') + line;
  }
  return text;
}

async function parseSargas() {
  const sargas = [];
  let sarga = null;
  let sa = [];
  let en = [];
  let lastVerse = 0;
  let mode = 'idle'; // idle | summary | body | colophon

  const flushUnit = (start, end) => {
    if (!sarga || (!sa.length && !en.length)) return;
    const translation = joinProse(en);
    if (translation) {
      const verseStart = start ?? lastVerse + 1;
      const verseEnd = end ?? verseStart;
      sarga.units.push({ sanskrit: joinShloka(sa), translation, verseStart, verseEnd });
      lastVerse = verseEnd;
    }
    sa = [];
    en = [];
  };

  const rl = readline.createInterface({ input: fs.createReadStream(PATHS.pages) });
  for await (const row of rl) {
    const { page, runs } = JSON.parse(row);
    for (const line of pageToLines(runs)) {
      if (line.f === 'en') {
        const text = nalandaToUnicode(line.raw);
        if (!text) continue;
        const canto = line.full && line.h >= 11.5 ? CANTO_RE.exec(text) : null;
        if (canto) {
          flushUnit();
          sarga = { number: romanToInt(canto[1]), page, summary: '', colophon: '', units: [] };
          sargas.push(sarga);
          lastVerse = 0;
          mode = 'summary';
        } else if (!sarga) {
          continue;
        } else if (line.full) {
          if (/^Thus ends?\b/.test(text)) {
            flushUnit();
            mode = 'colophon';
          }
          if (mode === 'colophon') sarga.colophon += ' ' + text;
          else if (mode === 'summary') sarga.summary += ' ' + text;
        } else if (mode !== 'colophon') {
          mode = 'body';
          en.push(text);
          const m = VERSE_NO_RE.exec(text);
          if (m) {
            en[en.length - 1] = text.replace(VERSE_NO_RE, '').trim();
            flushUnit(Number(m[1]), Number(m[2] || m[1]));
          }
        }
      } else if (line.f === 'sa' && !line.full && sarga && mode !== 'colophon') {
        // A shloka line after unnumbered translation starts a new unit.
        if (en.length) flushUnit();
        mode = 'body';
        const text = chanakyaToUnicode(line.raw);
        if (text) sa.push(text);
      }
    }
  }
  flushUnit();
  return sargas;
}

/** Kanda comes from each sarga's colophon ("Thus ends Canto One in the Bālakāṇḍa …"). */
function assignKandas(sargas) {
  for (const s of sargas) {
    s.kanda = KANDAS.find((k) => k.match.test(s.colophon)) || null;
  }
  // Colophon-less sargas (rare layout misses) inherit from the nearest labelled neighbour.
  for (let i = 0; i < sargas.length; i++) {
    if (sargas[i].kanda) continue;
    const next = sargas.slice(i + 1).find((s) => s.kanda);
    const prev = [...sargas.slice(0, i)].reverse().find((s) => s.kanda);
    sargas[i].kanda = sargas[i].number === 1 ? next?.kanda || prev?.kanda : prev?.kanda || next?.kanda;
  }
}

function buildChunks(sargas) {
  const chunks = [];
  const ids = new Set();
  for (const s of sargas) {
    if (!s.kanda || !s.units.length) continue;
    const summary = s.summary.replace(/\s+/g, ' ').trim();
    let group = [];
    let size = 0;
    const emit = () => {
      if (!group.length) return;
      const verseStart = group[0].verseStart;
      const verseEnd = group[group.length - 1].verseEnd;
      let id = `${s.kanda.index}.${s.number}.${verseStart}-${verseEnd}`;
      while (ids.has(id)) id += 'b';
      ids.add(id);
      const translation = group
        .map((u) => `${u.translation} (${u.verseStart === u.verseEnd ? u.verseStart : `${u.verseStart}-${u.verseEnd}`})`)
        .join('\n');
      chunks.push({
        id,
        kanda: s.kanda.name,
        kanda_index: s.kanda.index,
        sarga: s.number,
        verse_start: verseStart,
        verse_end: verseEnd,
        sanskrit: group.map((u) => u.sanskrit).filter(Boolean).join('\n'),
        translation,
        sarga_summary: summary,
        // Diacritic-free copy so keyword search matches "Sita", "Lakshmana"-style spellings.
        search_text: foldDiacritics(`${summary}\n${translation}`),
        page: s.page,
      });
      group = [];
      size = 0;
    };
    for (const u of s.units) {
      group.push(u);
      size += u.translation.length;
      if (size >= TARGET_CHARS || group.length >= MAX_UNITS) emit();
    }
    emit();
  }
  return chunks;
}

async function main() {
  if (!fs.existsSync(PATHS.pages)) throw new Error('Run `npm run ingest:extract` first.');
  const sargas = await parseSargas();
  assignKandas(sargas);
  const chunks = buildChunks(sargas);
  fs.writeFileSync(PATHS.chunks, chunks.map((c) => JSON.stringify(c)).join('\n') + '\n');

  const perKanda = {};
  for (const s of sargas) {
    const k = s.kanda?.name || 'UNKNOWN';
    perKanda[k] ??= { sargas: 0, verses: 0 };
    perKanda[k].sargas++;
    perKanda[k].verses += s.units.length;
  }
  console.table(perKanda);
  const noSanskrit = chunks.filter((c) => !c.sanskrit).length;
  console.log(`sargas: ${sargas.length}, chunks: ${chunks.length}, chunks without Sanskrit: ${noSanskrit}`);
  console.log(`wrote ${PATHS.chunks}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
