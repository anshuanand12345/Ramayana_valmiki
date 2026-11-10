import { useMemo } from 'react'
import Markdown from 'react-markdown'
import { parseCounsel } from '../utils/parseCounsel.js'
import Passages from './Passages.jsx'
import PipelineStatus from './PipelineStatus.jsx'

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

function Shloka({ section }) {
  if (!section.verse.length) return <Markdown>{section.body}</Markdown>
  return (
    <>
      <figure className="shloka">
        <blockquote lang="sa">
          {section.verse.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </blockquote>
        {section.reference && <figcaption>{section.reference}</figcaption>}
      </figure>
      {section.note && <Markdown>{section.note}</Markdown>}
    </>
  )
}

function Transliteration({ section }) {
  if (!section.iast.length && !section.words.length) return <Markdown>{section.body}</Markdown>
  return (
    <>
      {section.iast.length > 0 && (
        <>
          <p className="label">IAST</p>
          <p className="iast">
            {section.iast.map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </p>
        </>
      )}
      {section.words.length > 0 && (
        <dl className="words">
          {section.words.map((w, i) => (
            <div key={i}>
              <dt>{w.term}</dt>
              <dd>{w.meaning}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  )
}

function VerseContext({ section }) {
  if (!section.context && !section.explanation) return <Markdown>{section.body}</Markdown>
  return (
    <>
      {section.context && (
        <>
          <p className="label">Context</p>
          <Markdown>{section.context}</Markdown>
        </>
      )}
      {section.explanation && (
        <>
          <p className="label">Explanation</p>
          <Markdown>{section.explanation}</Markdown>
        </>
      )}
    </>
  )
}

function Steps({ section }) {
  if (!section.steps.length) return <Markdown>{section.body}</Markdown>
  return (
    <ol className="steps">
      {section.steps.map((step, i) => (
        <li key={i}>
          <span className="step-number">{i + 1}</span>
          <div>
            {step.title && <h3>{step.title}</h3>}
            <Markdown>{step.text}</Markdown>
          </div>
        </li>
      ))}
    </ol>
  )
}

const BODIES = { shloka: Shloka, transliteration: Transliteration, context: VerseContext, steps: Steps }

export default function Counsel({ counsel }) {
  const { preface, sections } = useMemo(() => parseCounsel(counsel.content), [counsel.content])

  return (
    <article className="counsel">
      <header className="counsel-head">
        <span className="label">Counsel</span>
        <q>{counsel.question}</q>
      </header>

      {counsel.stage && !counsel.content && <PipelineStatus stage={counsel.stage} />}
      {counsel.error && <p className="error">{counsel.error}</p>}

      {preface && (
        <div className="prose preface">
          <Markdown>{preface}</Markdown>
        </div>
      )}

      {sections.map((section, i) => {
        const Body = BODIES[section.key]
        return (
          <section key={i} className={`part part-${section.key}`}>
            <span className="numeral" aria-hidden="true">
              {NUMERALS[i]}
            </span>
            <div className="part-body prose">
              <h2>{section.title}</h2>
              {Body ? <Body section={section} /> : <Markdown>{section.body}</Markdown>}
            </div>
          </section>
        )
      })}

      {!counsel.stage && <Passages sources={counsel.sources} grounded={counsel.grounded} />}
    </article>
  )
}
