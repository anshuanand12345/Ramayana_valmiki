/**
 * The API streams the counsel as markdown with five fixed "###" sections.
 * This turns that markdown into structured data so each section can be typeset
 * on its own. Parsing is tolerant: it runs on every streamed token, and anything
 * it does not recognise falls back to plain markdown (`body`).
 */

const SECTIONS = [
    { key: 'steps', match: /action|steps/i, title: 'Practical Action Steps' },
  { key: 'guidance', match: /guidance/i, title: 'Spiritual Guidance' },
  { key: 'shloka', match: /shloka|sloka|śloka/i, title: 'Vālmīki Rāmāyaṇa Śloka' },
  { key: 'transliteration', match: /transliteration|word/i, title: 'Transliteration & Word Meaning' },
  { key: 'context', match: /context|explanation/i, title: 'Verse Context & Explanation' },
]

const DEVANAGARI = /[ऀ-ॿ]/g
const stripMarks = (s) => s.replace(/^[\s>*•-]+/, '').replace(/[*_`]/g, '').trim()

function parseShloka(body) {
  const verse = []
  const note = []
  let reference = ''
  for (const raw of body.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if ((line.match(DEVANAGARI) || []).length >= 4) verse.push(stripMarks(line))
    else if (/^[*_]*[—–-]\s*\S/.test(line) && verse.length) reference = stripMarks(line.replace(/^[*_]*[—–-]\s*/, ''))
    else note.push(line)
  }
  return { verse, reference, note: note.join('\n') }
}

function parseTransliteration(body) {
  const split = body.search(/word[- ]by[- ]word/i)
  const iastPart = split === -1 ? body : body.slice(0, split)
  const wordPart = split === -1 ? '' : body.slice(split)

  const iast = iastPart
    .split('\n')
    .map((l) => stripMarks(l.replace(/\**IAST Transliteration:?\**:?/i, '')))
    .filter(Boolean)

  const words = []
  for (const line of wordPart.split('\n').slice(1)) {
    const m = /^\s*[-*•]\s*\**(.+?)\**\s*(?:=|—|–|:)\s+(.+)$/.exec(line)
    if (m) words.push({ term: stripMarks(m[1]), meaning: stripMarks(m[2]) })
  }
  return { iast, words }
}

function parseContext(body) {
  const grab = (label, until) => {
    const re = new RegExp(`\\*\\*${label}:?\\*\\*:?\\s*([\\s\\S]*?)(?=${until}|$)`, 'i')
    return re.exec(body)?.[1].trim() || ''
  }
  return {
    context: grab('Context', '\\n\\s*[*-]?\\s*\\*\\*Detailed Explanation'),
    explanation: grab('Detailed Explanation', '$^'),
  }
}

function parseSteps(body) {
  const steps = []
  for (const raw of body.split('\n')) {
    const start = /^\s*\d+[.)]\s+(.*)$/.exec(raw)
    if (start) {
      const titled = /^\*\*(.+?)\*\*:?\s*(.*)$/.exec(start[1])
      steps.push(titled ? { title: titled[1].replace(/:$/, ''), text: titled[2] } : { title: '', text: start[1] })
    } else if (steps.length && raw.trim()) {
      const last = steps[steps.length - 1]
      last.text += (last.text ? ' ' : '') + raw.trim()
    }
  }
  return { steps }
}

const PARSERS = { shloka: parseShloka, transliteration: parseTransliteration, context: parseContext, steps: parseSteps }

export function parseCounsel(markdown) {
  const [preface, ...parts] = markdown.split(/^###\s+/m)
  const sections = parts.map((part) => {
    const newline = part.indexOf('\n')
    const heading = newline === -1 ? part : part.slice(0, newline)
    const body = newline === -1 ? '' : part.slice(newline + 1).trim()
    const known = SECTIONS.find((s) => s.match.test(heading))
    return {
      key: known?.key || 'other',
      title: known?.title || stripMarks(heading.replace(/[^\p{L}\p{N}\s&,'-]/gu, '')),
      body,
      ...(known && PARSERS[known.key] ? PARSERS[known.key](body) : {}),
    }
  })
  return { preface: preface.trim(), sections }
}
