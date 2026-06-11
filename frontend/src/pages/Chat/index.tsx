import { useState, useEffect, useRef, useCallback } from 'react'
import { createSession, streamMessage } from '@/api/chat'
import type { ChatMessage, ChatSources } from '@/types/chat'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import StarterPrompts from './StarterPrompts'

const SESSION_KEY_STORAGE = 'ev_chat_session_key'

function getOrCreateSessionKey(): string {
  let key = localStorage.getItem(SESSION_KEY_STORAGE)
  if (!key) {
    key = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY_STORAGE, key)
  }
  return key
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [sessionKey] = useState(getOrCreateSessionKey)
  const [sessionReady, setSessionReady] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<(() => void) | null>(null)

  // Ensure session exists on the backend
  useEffect(() => {
    createSession(sessionKey)
      .then(() => setSessionReady(true))
      .catch(() => setSessionReady(true)) // proceed even if this fails
  }, [sessionKey])

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Cancel in-flight stream on unmount
  useEffect(() => () => { cancelRef.current?.() }, [])

  const sendMessage = useCallback((text: string) => {
    if (!sessionReady || isStreaming) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }

    const assistantId = crypto.randomUUID()
    const placeholderMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    }

    setMessages(prev => [...prev, userMsg, placeholderMsg])
    setIsStreaming(true)

    const cancel = streamMessage(sessionKey, text, {
      onSources: (sources: ChatSources) => {
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, sources } : m)
        )
      },
      onToken: (token: string) => {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId ? { ...m, content: m.content + token } : m
          )
        )
      },
      onDone: () => {
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, isStreaming: false } : m)
        )
        setIsStreaming(false)
        cancelRef.current = null
      },
      onError: (message: string) => {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, isStreaming: false, error: message }
              : m
          )
        )
        setIsStreaming(false)
        cancelRef.current = null
      },
    })

    cancelRef.current = cancel
  }, [sessionKey, sessionReady, isStreaming])

  function handleClearChat() {
    if (isStreaming) return
    // Generate a new session key for a fresh conversation
    const newKey = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY_STORAGE, newKey)
    window.location.reload()
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal-500" />
          <h1 className="text-sm font-semibold text-slate-800">AI Policy Assistant</h1>
          <span className="text-xs text-slate-400 hidden sm:block">
            Grounded in {messages.length > 0 ? 'verified policy data' : '37 policies · 109 incentives'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              disabled={isStreaming}
              className="text-xs text-slate-400 hover:text-slate-600 disabled:opacity-40"
            >
              New chat
            </button>
          )}
          <span className="text-xs text-slate-300">claude-sonnet-4-6</span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <StarterPrompts onSelect={sendMessage} />
        ) : (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="max-w-3xl mx-auto w-full">
        <ChatInput onSubmit={sendMessage} disabled={isStreaming || !sessionReady} />
        <p className="text-center text-xs text-slate-300 pb-3">
          Answers are grounded in structured policy data · May not reflect the very latest updates
        </p>
      </div>
    </div>
  )
}
