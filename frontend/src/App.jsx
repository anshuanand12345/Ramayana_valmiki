import Counsel from './components/Counsel.jsx'
import Header from './components/Header.jsx'
import QuestionForm from './components/QuestionForm.jsx'
import { useCounsel } from './hooks/useCounsel.js'
import { useServerStatus } from './hooks/useServerStatus.js'
import { useTheme } from './hooks/useTheme.js'

export default function App() {
  const { counsel, isStreaming, ask, stop } = useCounsel()
  const { theme, toggle } = useTheme()
  const serverStatus = useServerStatus()

  return (
    <>
      <Header theme={theme} onToggleTheme={toggle} />
      <main className="page">
        <QuestionForm onAsk={ask} onStop={stop} isStreaming={isStreaming} serverStatus={serverStatus} />
        {counsel && <Counsel counsel={counsel} />}
      </main>
      <footer className="colophon">
        Reflections drawn from scripture by an AI — not a substitute for professional medical, legal or mental-health
        advice.
      </footer>
    </>
  )
}
