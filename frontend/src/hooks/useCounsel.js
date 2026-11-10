import { useCallback, useRef, useState } from 'react'
import { streamChat } from '../api/chatClient.js'

/** One question, one counsel: asking again replaces the previous answer. */
export function useCounsel() {
  const [counsel, setCounsel] = useState(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef(null)

  const ask = useCallback(async (text) => {
    const question = text.trim()
    if (!question) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const isCurrent = () => abortRef.current === controller
    const patch = (update) =>
      isCurrent() && setCounsel((prev) => ({ ...prev, ...(typeof update === 'function' ? update(prev) : update) }))

    setCounsel({ question, content: '', stage: 'transform', sources: [], grounded: true, error: null })
    setIsStreaming(true)

    try {
      await streamChat({
        message: question,
        history: [],
        signal: controller.signal,
        onEvent: (event, data) => {
          if (event === 'stage') patch({ stage: data.stage })
          else if (event === 'sources') patch({ sources: data.sources, grounded: data.grounded })
          else if (event === 'token') patch((prev) => ({ content: prev.content + data.text }))
          else if (event === 'error') patch({ error: data.message })
        },
      })
    } catch (err) {
      if (err.name !== 'AbortError') patch({ error: err.message || 'Could not reach the server. Please try again.' })
    } finally {
      if (isCurrent()) {
        patch({ stage: null })
        setIsStreaming(false)
        abortRef.current = null
      }
    }
  }, [])

  const stop = useCallback(() => abortRef.current?.abort(), [])

  return { counsel, isStreaming, ask, stop }
}
