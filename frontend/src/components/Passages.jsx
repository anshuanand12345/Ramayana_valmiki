const KANDA = {
  'Bala Kanda': 'Bāla Kāṇḍa',
  'Ayodhya Kanda': 'Ayodhyā Kāṇḍa',
  'Aranya Kanda': 'Araṇya Kāṇḍa',
  'Kishkindha Kanda': 'Kiṣkindhā Kāṇḍa',
  'Sundara Kanda': 'Sundara Kāṇḍa',
  'Yuddha Kanda': 'Yuddha Kāṇḍa',
  'Uttara Kanda': 'Uttara Kāṇḍa',
}

function reference(s) {
  const verses = s.verseStart === s.verseEnd ? s.verseStart : `${s.verseStart}–${s.verseEnd}`
  return `${KANDA[s.kanda] || s.kanda} ${s.sarga}.${verses}`
}

export default function Passages({ sources, grounded }) {
  if (!sources.length) return null
  return (
    <section className="passages">
      <h2 className="label">{grounded ? 'Passages retrieved' : 'Closest passages found'}</h2>
      {sources.map((s) => (
        <details key={s.id}>
          <summary>
            <span>{s.sargaSummary || 'Passage'}</span>
            <span className="passage-ref">{reference(s)}</span>
          </summary>
          <p className="passage-sanskrit" lang="sa">
            {s.sanskrit}
          </p>
          <p className="passage-translation">{s.translation}</p>
        </details>
      ))}
    </section>
  )
}
