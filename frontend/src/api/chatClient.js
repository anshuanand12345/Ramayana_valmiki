const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

export async function checkHealth() {
  const res = await fetch(`${API_URL}/health`)
  if (!res.ok) throw new Error(`Health check failed (${res.status})`)
  return res.json()
}

/**
 * POST /chat and read the Server-Sent Events response.
 * (EventSource only supports GET, so the stream is parsed from fetch.)
 * Calls onEvent(event, data) for every server event.
 */
export async function streamChat({ message, history, signal, onEvent }) {
  const res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
    signal,
  })

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error?.message || `Request failed (${res.status})`)
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value
    const frames = buffer.split('\n\n')
    buffer = frames.pop()
    for (const frame of frames) {
      const event = /^event: (.+)$/m.exec(frame)?.[1]
      const data = /^data: (.+)$/m.exec(frame)?.[1]
      if (event && data) onEvent(event, JSON.parse(data))
    }
  }
}
