/**
 * Chanakya (legacy 8-bit Devanagari font) → Unicode converter.
 *
 * The Gita Press PDF stores Sanskrit as Chanakya glyph codes. pdf.js surfaces those
 * codes as the Mac Roman characters of the same byte values, so decoding is:
 *   1. PDF char → Mac Roman byte → the Windows-1252 char for that byte
 *      (the form every public Chanakya mapping table is written in),
 *   2. ordered glyph → Unicode substitution (GLYPH_MAP),
 *   3. reorder what legacy fonts store visually: the pre-base "ि" matra and the reph.
 *
 * GLYPH_MAP follows the widely circulated open Chanakya→Unicode table used by
 * online Hindi font converters; order matters (longer sequences first).
 */

// prettier-ignore
const GLYPH_MAP = [
  ['¤', ''],
  ['U', ''],
  ['¢ð', 'ð¢'],
  ['´ð', 'ð´'],
  ['ð¸', '¸ð'],
  ['Ò', '\''],
  ['¥æò', 'ऑ'],
  ['¸\u008d', 'फ़्'],
  ['¸•', 'क़'],
  ['¸¹', 'ख़'],
  ['¸»', 'ग़'],
  ['¸Á', 'ज़'],
  ['¸Ç', 'ड़'],
  ['¸É', 'ढ़'],
  ['¸È', 'फ़'],
  ['¸Ø', 'य़'],
  ['¸Ú', 'ऱ'],
  ['¸Ù', 'ऩ'],
  ['A', '्र'],
  ['B', 'क्च'],
  ['C', 'ष्ट'],
  ['D', 'ष्ठ'],
  ['E', 'श्व'],
  ['F', 'स्न'],
  ['G', 'त्र'],
  ['H', '॥'],
  ['I', 'ढ्ढ'],
  ['J', 'छ्व'],
  ['K', '्य'],
  ['L', 'रु'],
  ['M', 'रू'],
  ['N', 'हृ'],
  ['O', 'ह्र'],
  ['P', 'क्क'],
  ['Q', 'क्त'],
  ['R', 'क्र'],
  ['T', 'ञ्ज'],
  ['V', 'ङ्क'],
  ['W', 'ङ्ख'],
  ['X', 'ङ्ग'],
  ['Y', 'ङ्घ'],
  ['`', 'क्व'],
  ['a', 'ड्ड'],
  ['b', 'ड्ढ'],
  ['d', 'स्र'],
  ['e', 'द्ग'],
  ['f', 'द्घ'],
  ['g', 'द्द'],
  ['h', 'द्ध'],
  ['i', 'द्ब'],
  ['j', 'द्भ'],
  ['k', 'द्म'],
  ['l', 'द्य'],
  ['m', 'द्व'],
  ['n', 'ठ्ठ'],
  ['p', 'श्च'],
  ['q', 'ह्न'],
  ['r', 'ह्म्'],
  ['s', 'ह्य'],
  ['t', 'ह्ल'],
  ['u', 'ह्व'],
  ['žæ', 'त्त'],
  ['ž', 'त्त्'],
  ['#', 'प्त'],
  ['%', 'त्न'],
  ['@', 'ञ्च'],
  ['„', 'ल्ल'],
  ['¦', 'ष्ट्व'],
  ['¨', 'ङ्क्ष'],
  ['¯', 'ख्न'],
  ['µ', 'द्ब्र'],
  ['º', 'ख्र'],
  ['Cþ', 'ष्ट्र'],
  ['q', 'ह्न'],
  ['Ê', 'ज़्'],
  ['u', 'ह्व'],
  ['g', 'द्द'],
  ['Ÿæ', 'श्र'],
  ['Åþ', 'ट्र'],
  ['Çþ', 'ड्र'],
  ['Éþ', 'ढ्र'],
  ['^', 'ट्ट'],
  ['h', 'द्ध'],
  ['Ð', '।'],
  ['ý', '्र'],
  ['þ', '्र'],
  ['¥ô', 'ओ'],
  ['¥æð', 'ओ'],
  ['¥õ', 'औ'],
  ['¥æñ', 'औ'],
  ['¥æ', 'आ'],
  ['¥', 'अ'],
  ['§Z', 'ईं'],
  ['§ü', 'ई'],
  ['§', 'इ'],
  ['©', 'उ'],
  ['ª', 'ऊ'],
  ['«', 'ऋ'],
  ['¬', 'ॠ'],
  ['­', 'ऌ'],
  ['°ð', 'ऐ'],
  ['°', 'ए'],
  ['€', 'क्'],
  ['·', 'क'],
  ['\u0081', 'ख्'],
  ['¹', 'ख'],
  ['‚', 'ग्'],
  ['»', 'ग'],
  ['ƒæ', 'घ'],
  ['ƒ', 'घ्'],
  ['¾', 'ङ'],
  ['“', 'च्च्'],
  ['‘', 'च्'],
  ['¿', 'च'],
  ['À', 'छ'],
  ['”', 'ज्ज्'],
  ['…', 'ज्'],
  ['’', 'ज्'],
  ['Á', 'ज'],
  ['Ûæ', 'झ'],
  ['Û', 'झ्'],
  ['†æ', 'ञ'],
  ['†', 'ञ्'],
  ['Å', 'ट'],
  ['Æ', 'ठ'],
  ['Ç', 'ड'],
  ['É', 'ढ'],
  ['‡æ', 'ण'],
  ['‡', 'ण्'],
  ['ˆ', 'त्'],
  ['Ì', 'त'],
  ['‰', 'थ्'],
  ['Í', 'थ'],
  ['Î', 'द'],
  ['¼', 'द'],
  ['Š', 'ध्'],
  ['Ï', 'ध'],
  ['óæ', 'न्न'],
  ['ó', 'न्न्'],
  ['‹æ', 'न'],
  ['Ù', 'न'],
  ['‹', 'न्'],
  ['Œ', 'प्'],
  ['Â', 'प'],
  ['\u008d', 'फ्'],
  ['È', 'फ'],
  ['Ž', 'ब्'],
  ['Õ', 'ब'],
  ['\u008f', 'भ्'],
  ['Ö', 'भ'],
  ['\u0090', 'म्'],
  ['×', 'म'],
  ['Ä', 'य्'],
  ['Ø', 'य'],
  ['Ú', 'र'],
  ['Ë', 'ल्'],
  ['Ü', 'ल'],
  ['¶', 'ल'],
  ['Ý', 'ळ'],
  ['Ã', 'व्'],
  ['ß', 'व'],
  ['àæ', 'श'],
  ['³æ', 'श'],
  ['o', 'श'],
  ['³', 'श्'],
  ['à', 'श्'],
  ['c', 'ष्'],
  ['á', 'ष'],
  ['S', 'स्'],
  ['â', 'स'],
  ['ã', 'ह'],
  ['±', 'ह्'],
  ['ÿæ', 'क्ष'],
  ['ÿ', 'क्ष्'],
  ['˜æ', 'त्र'],
  ['˜', 'त्र्'],
  ['™æ', 'ज्ञ'],
  ['™', 'ज्ञ्'],
  ['üð´', 'ðZ'],
  ['æò', 'ॉ'],
  ['æñ', 'ौ'],
  ['æ', 'ा'],
  ['è', 'ी'],
  ['é', 'ु'],
  ['ê', 'ू'],
  ['ä', 'ु'],
  ['å', 'ू'],
  ['ë', 'ृ'],
  ['ì', 'ॄ'],
  ['í', 'ॢ'],
  ['Ô', 'े'],
  ['ñ', 'ै'],
  ['ô', 'ो'],
  ['õ', 'ौ'],
  ['¢', 'ं'],
  ['´', 'ं'],
  ['¡', 'ँ'],
  ['Ñ', ':'],
  ['¸', '़'],
  ['ò', 'ॅ'],
  ['ù', 'ऽ'],
  ['÷', '्'],
  ['ð', 'े'],
  ['0', '०'],
  ['1', '१'],
  ['2', '२'],
  ['3', '३'],
  ['4', '४'],
  ['5', '५'],
  ['6', '६'],
  ['7', '७'],
  ['8', '८'],
  ['9', '९'],
  ['®', '0'],
  ['v', '1'],
  ['w', '2'],
  ['x', '3'],
  ['y', '4'],
  ['z', '5'],
  ['{', '6'],
  ['|', '7'],
  ['}', '8'],
  ['~', '9'],
  ['्ो', 'े'],
  ['्ौ', 'ै'],
  ['्ाे', 'े'],
  ['्ाा', 'ा'],
  ['ाे', 'ो'],
  ['ाे', 'ो'],
  ['ाै', 'ौ'],
  ['्ा', ''],
  ['ंु', 'ुं'],
  ['ओे', 'ओ'],
  ['ोे', 'ो'],
  ['ाे', 'ो'],
  ['ईंं', 'ईं'],
];

const PRE_I = 'ç'; // "ि" drawn before its consonant cluster
const REPH = 'ü'; // "र्" drawn after its consonant cluster

const macDecoder = new TextDecoder('macintosh');
const winDecoder = new TextDecoder('windows-1252');
const MAC_TO_WIN = new Map();
for (let b = 0x80; b <= 0xff; b++) {
  const bytes = Uint8Array.of(b);
  MAC_TO_WIN.set(macDecoder.decode(bytes), winDecoder.decode(bytes));
}
// pdf.js yields ligature/private-use code points for a few Mac Roman glyph names.
MAC_TO_WIN.set('', 'ð');
MAC_TO_WIN.set('ﬁ', 'Þ');
MAC_TO_WIN.set('ﬂ', 'ß');

MAC_TO_WIN.set('\u00a4', '\u00db'); // 0xDB: currency sign in classic Mac Roman, euro sign in newer tables

// Glyphs the public table misses but Sanskrit typesetting uses.
const EXTRA_GLYPHS = [
  ['\u0178', '\u0936\u094d\u0930\u094d'], // half form; completes with a following \u093e-stroke
  ['\u00f6', '\u0939\u094d\u0923'],
  ['\u00fa', '\u0950'],
  ['\u00d3', "'"],
];
const insertAt = GLYPH_MAP.findIndex(([glyph]) => glyph === '\u0178\u00e6') + 1;
GLYPH_MAP.splice(insertAt, 0, ...EXTRA_GLYPHS);
// In this font "A" is the subjoined \u0928 (\u0905\u0917\u094d\u0928\u093f, \u0936\u0924\u094d\u0930\u0941\u0918\u094d\u0928), not the \u094d\u0930 the public table lists.
GLYPH_MAP.find(([glyph]) => glyph === 'A')[1] = '\u094d\u0928';

const CONSONANT = '[\\u0915-\\u0939\\u0958-\\u095f]\\u093c?';
const CLUSTER = `${CONSONANT}(?:\\u094d${CONSONANT})*`;
const PRE_I_RE = new RegExp(`${PRE_I}(${CLUSTER})`, 'g');
// A reph follows its cluster and any matras/modifiers attached to it.
const REPH_RE = new RegExp(`(${CLUSTER}|[\\u0905-\\u0914])([\\u093e-\\u094c\\u0901-\\u0903]*)${REPH}`, 'g');
// A reph typed mid-cluster (e.g. \u092e\u0942\u0930\u094d\u091a\u094d\u091b\u093f\u0924) belongs to the whole cluster.
const MID_REPH_RE = new RegExp(`\\u094d${REPH}(${CONSONANT})`, 'g');

// Pre-base "ि" glyphs that also carry a reph (र्…ि) or a reph + anusvara (र्…िं).
const PRE_I_REPH = '';
const PRE_I_REPH_ANUSVARA = '';
const PRE_I_REPH_RE = new RegExp(`${PRE_I_REPH}(${CLUSTER})`, 'g');
const PRE_I_REPH_ANUSVARA_RE = new RegExp(`${PRE_I_REPH_ANUSVARA}(${CLUSTER})`, 'g');
// An anusvara typed inside the cluster of a pre-base "ि" (कस्मिंश्चित्) sounds after the matra.
const PRE_I_ANUSVARA_RE = new RegExp(`${PRE_I}((?:${CONSONANT}\\u094d)*)\\u0902(${CLUSTER})`, 'g');

function toTableForm(pdfText) {
  let out = '';
  for (const ch of pdfText) out += MAC_TO_WIN.get(ch) ?? ch;
  return out
    .replace(/í/g, PRE_I_REPH)
    .replace(/ì/g, PRE_I_REPH_ANUSVARA)
    .replace(/\s+¢/g, '¢') // anusvara is kerned with a leading space
    .replace(/¢æ/g, 'æ¢') // anusvara typed before the ा-stroke that completes a half glyph
    .replace(new RegExp(`${PRE_I}\\s+`, 'g'), PRE_I);
}

/** Convert one line of Chanakya-encoded text (as extracted by pdf.js) to Unicode Devanagari. */
export function chanakyaToUnicode(pdfText) {
  let s = toTableForm(pdfText);

  for (const [glyph, unicode] of GLYPH_MAP) {
    if (s.includes(glyph)) s = s.split(glyph).join(unicode);
  }
  s = s.replace(/ï/g, ''); // decorative tail stroke of ह/ट-type glyphs
  s = s.replace(/\s+(?=[ा-्ँ-ः])/g, ''); // dependent signs never start a word
  // "Z" is reph + anusvara, typed before any vowel sign of the same syllable (कर्तुं).
  s = s.replace(/Z([ा-ौ]*)/g, `$1${REPH}ं`);

  s = s.replace(MID_REPH_RE, `्$1${REPH}`);
  s = s.replace(PRE_I_ANUSVARA_RE, '$1$2िं');
  s = s.replace(PRE_I_REPH_RE, 'र्$1ि');
  s = s.replace(PRE_I_REPH_ANUSVARA_RE, 'र्$1िं');
  s = s.replace(PRE_I_RE, '$1ि');
  s = s.replace(REPH_RE, 'र्$1$2');

  return s
    .replace(/:/g, 'ः')
    .replace(/ीे/g, 'ी')
    .replace(/ेे/g, 'े')
    .replace(/ृृ/g, 'ॄ') // doubled ृ glyph is the long vowel ॄ
    .replace(/ं(ॄ)/g, '$1ं')
    .replace(/([ा-ौ])\1+/g, '$1')
    .replace(/्+/g, '्')
    .replace(/् (?=[॥।]|$)/g, '्')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Characters left over after conversion that are not Devanagari — used to audit the mapping. */
export function nonDevanagari(text) {
  return text.replace(/[ऀ-ॿ\s‌‍]/g, '');
}
