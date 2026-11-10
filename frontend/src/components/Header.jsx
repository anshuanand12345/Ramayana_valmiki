import Logo from './Logo.jsx'
import ThemeToggle from './ThemeToggle.jsx'

export default function Header({ theme, onToggleTheme }) {
  return (
    <header className="masthead">
      <div className="masthead-inner">
        <p className="wordmark">
          <Logo />
          Ramayana Guide{' '}
          <span lang="sa" aria-hidden="true">
            रामायण
          </span>
        </p>
        <div className="masthead-side">
          <p className="masthead-note">Counsel from Vālmīki</p>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  )
}
