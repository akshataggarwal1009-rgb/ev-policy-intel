import api from './client'
import type { SessionInfo } from '@/types/chat'

export async function createSession(sessionKey: string): Promise<SessionInfo> {
  const { data } = await api.post<SessionInfo>('/chat/sessions', { session_key: sessionKey })
  return data
}

export async function getSession(sessionKey: string): Promise<SessionInfo | null> {
  try {
    const { data } = await api.get<SessionInfo>(`/chat/sessions/${sessionKey}`)
    return data
  } catch {
    return null
  }
}

/**
 * Opens an SSE stream for a chat message.
 * Calls the provided callbacks as events arrive.
 * Returns a cleanup function that aborts the stream.
 */
export function streamMessage(
  sessionKey: string,
  content: string,
  callbacks: {
    onSources: (sources: import('@/types/chat').ChatSources) => void
    onToken: (text: string) => void
    onDone: () => void
    onError: (message: string) => void
  }
): () => void {
  const controller = new AbortController()

  ;(async () => {
    try {
      const response = await fetch(`/api/v1/chat/sessions/${sessionKey}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const text = await response.text().catch(() => `HTTP ${response.status}`)
        callbacks.onError(text)
        return
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE blocks are separated by double newline
        const blocks = buffer.split('\n\n')
        buffer = blocks.pop() ?? ''

        for (const block of blocks) {
          const dataLine = block.split('\n').find(l => l.startsWith('data: '))
          if (!dataLine) continue
          try {
            const event = JSON.parse(dataLine.slice(6))
            if (event.type === 'token')   callbacks.onToken(event.text)
            if (event.type === 'sources') callbacks.onSources(event.sources)
            if (event.type === 'done')    callbacks.onDone()
            if (event.type === 'error')   callbacks.onError(event.message)
          } catch {
            // malformed JSON — skip
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        callbacks.onError(err.message)
      }
    }
  })()

  return () => controller.abort()
}
