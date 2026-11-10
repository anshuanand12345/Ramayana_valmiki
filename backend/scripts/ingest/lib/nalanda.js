/**
 * Nalanda (legacy diacritic font) → Unicode IAST.
 * The English translation uses this font for transliterated Sanskrit names,
 * e.g. "›r∂ Råma" → "Śrī Rāma", "Lak¶maƒa" → "Lakṣmaṇa".
 */

// "°" is a dot-below accent typed before a capital letter.
const DOTTED = { N: 'Ṇ', T: 'Ṭ', D: 'Ḍ', S: 'Ṣ', R: 'Ṛ', H: 'Ḥ', M: 'Ṁ', L: 'Ḷ', œ: 'Ḍ' };

const SINGLE = {
  å: 'ā',
  Å: 'Ā',
  '∂': 'ī',
  '∫': 'Ī',
  µ: 'ū',
  æ: 'ṛ',
  '¡': 'ṛ',
  ƒ: 'ṇ',
  Œ: 'ḍ',
  œ: 'Ḍ',
  '¢': 'ṭ',
  '›': 'Ś',
  '‹': 'ś',
  '¶': 'ṣ',
  '®': 'Ṣ',
  '∆': 'ṅ',
  '¤': 'ñ',
  '≈': 'ṁ',
  '√': 'ṁ',
  À: 'Ṁ',
  '¨': 'ḥ',
  ì: '“',
  î: '”',
  ë: '‘',
  í: '’',
  ó: '—',
  ñ: '–',
  '•': '',
};

export function nalandaToUnicode(text) {
  let s = text
    .replace(/°+([NTDSRHMLœ])/g, (_, c) => DOTTED[c])
    .replace(/§R/g, 'Ṛ')
    .replace(/ªU/g, 'Ū')
    .replace(/[°§ª]/g, '');
  let out = '';
  for (const ch of s) out += ch in SINGLE ? SINGLE[ch] : ch;
  return out.replace(/\s+/g, ' ').trim();
}

/** Strip diacritics so "Sītā" is also findable as "Sita" by keyword search. */
export function foldDiacritics(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}
