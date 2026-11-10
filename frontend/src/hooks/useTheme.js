import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'ramayana-guide-theme'

function initialTheme() {
  // index.html sets data-theme before first paint; read it back so React agrees with the page.
  const applied = document.documentElement.dataset.theme
  if (applied === 'light' || applied === 'dark') return applied
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // Private browsing: the choice simply lasts for this visit.
      }
      return next
    })
  }, [])

  return { theme, toggle }
}
