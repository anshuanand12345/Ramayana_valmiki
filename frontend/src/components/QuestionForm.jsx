import { useState } from 'react'

const PROMPTS = [
  { label: 'Grief after a loss', text: 'I am grieving the loss of someone close and cannot find the will to carry on.' },
  { label: 'Passed over at work', text: 'I was passed over for a promotion I worked toward for years, and I feel bitter and resentful.' },
  { label: 'Can’t forgive', text: 'Someone I trusted betrayed me, and I cannot bring myself to forgive them.' },
  { label: 'Lost my temper', text: 'I lose my temper with the people I love and regret it afterwards.' },
  { label: 'Repeated failure', text: 'I keep failing at something I have worked hard for, and I am close to giving up.' },
]

const SERVER_NOTICE = {
  waking: 'The guide is waking from sleep — this takes about a minute. You can write your question meanwhile.',
  down: 'The guide cannot be reached right now. Please try again in a few minutes.',
}

export default function QuestionForm({ onAsk, onStop, isStreaming, serverStatus }) {
  const [text, setText] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (text.trim() && !isStreaming) onAsk(text)
  }

  return (
    <section className="ask">
      <p className="eyebrow">Bring a question to the epic</p>
      <h1>What weighs on you today?</h1>
      <p className="lead">
        Describe a difficulty in plain words. The guide searches the verses of the Vālmīki Rāmāyaṇa and answers from
        what Rāma, Sītā, Lakṣmaṇa and Hanumān faced in the same straits.
      </p>

      <form onSubmit={submit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e)
          }}
          rows={4}
          maxLength={2000}
          placeholder="Write what you are facing…"
          aria-label="Your question"
        />
        <div className="ask-actions">
          <div className="chips">
            {PROMPTS.map((p) => (
              <button key={p.label} type="button" className="chip" onClick={() => setText(p.text)}>
                {p.label}
              </button>
            ))}
          </div>
          {isStreaming ? (
            <button type="button" className="seek" onClick={onStop}>
              Stop
            </button>
          ) : (
            <button type="submit" className="seek" disabled={!text.trim()}>
              Seek guidance
            </button>
          )}
        </div>
      </form>
      {SERVER_NOTICE[serverStatus] && (
        <p className={`server-notice ${serverStatus}`} role="status">
          {SERVER_NOTICE[serverStatus]}
        </p>
      )}
    </section>
  )
}
