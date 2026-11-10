const STAGES = [
  { key: 'transform', label: 'Understanding your question' },
  { key: 'retrieve', label: 'Searching the epic' },
  { key: 'rerank', label: 'Ranking passages' },
  { key: 'grade', label: 'Weighing their relevance' },
  { key: 'generate', label: 'Composing counsel' },
]

export default function PipelineStatus({ stage }) {
  // "correct" is the corrective re-search: the pipeline loops back to the search step.
  const active = stage === 'correct' ? 1 : STAGES.findIndex((s) => s.key === stage)
  return (
    <ol className="pipeline" aria-live="polite">
      {STAGES.map((s, i) => (
        <li key={s.key} className={i < active ? 'done' : i === active ? 'active' : ''}>
          {i === 1 && stage === 'correct' ? 'Widening the search' : s.label}
        </li>
      ))}
    </ol>
  )
}
