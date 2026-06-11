export interface PolicySource {
  jurisdiction: string
  title: string
  source_url: string | null
  status: string
}

export interface ChatSources {
  policies: PolicySource[]
  incentive_count: number
  retrieval_mode: 'vector' | 'keyword' | 'none'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSources
  isStreaming?: boolean
  error?: string
  created_at?: string
}

export interface SessionInfo {
  id: string
  session_key: string
  message_count: number
  created_at: string
}
