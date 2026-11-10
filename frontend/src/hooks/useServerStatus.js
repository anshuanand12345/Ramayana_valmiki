import { useEffect, useState } from 'react'
import { checkHealth } from '../api/chatClient.js'

const SLOW_AFTER_MS = 2500
const RETRY_EVERY_MS = 5000
const GIVE_UP_AFTER_MS = 120_000

/**
 * Free hosting puts the API to sleep when idle and takes about a minute to wake it.
 * Ping it as soon as the page opens — which also starts the wake-up — and report
 * 'checking' → 'waking' (slow to answer) → 'ready', or 'down' if it never answers.
 */
export function useServerStatus() {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let cancelled = false
    const started = Date.now()
    const slow = setTimeout(() => !cancelled && setStatus((s) => (s === 'checking' ? 'waking' : s)), SLOW_AFTER_MS)

    async function ping() {
      try {
        await checkHealth()
        if (!cancelled) setStatus('ready')
      } catch {
        if (cancelled) return
        if (Date.now() - started > GIVE_UP_AFTER_MS) setStatus('down')
        else {
          setStatus('waking')
          setTimeout(ping, RETRY_EVERY_MS)
        }
      }
    }
    ping()

    return () => {
      cancelled = true
      clearTimeout(slow)
    }
  }, [])

  return status
}
