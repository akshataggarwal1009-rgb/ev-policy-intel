import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage } from '@/types/chat'
import SourcesPanel from './SourcesPanel'

interface Props {
  message: ChatMessage
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] bg-teal-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 items-start">
      {/* Avatar */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center mt-0.5">
        <span className="text-teal-700 text-xs font-bold">AI</span>
      </div>

      <div className="flex-1 min-w-0">
        {/* Error state */}
        {message.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <p className="font-medium">Error</p>
            <p className="mt-0.5 text-xs">{message.error}</p>
          </div>
        )}

        {/* Streaming or final content */}
        {(message.content || message.isStreaming) && !message.error && (
          <div className="prose prose-sm prose-slate max-w-none
            prose-headings:font-semibold prose-headings:text-slate-800
            prose-p:text-slate-700 prose-p:leading-relaxed
            prose-li:text-slate-700
            prose-strong:text-slate-900
            prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
            prose-table:text-xs prose-th:bg-slate-50 prose-th:font-semibold
            prose-a:text-teal-600 prose-a:no-underline hover:prose-a:underline">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
            {message.isStreaming && <StreamingCursor />}
          </div>
        )}

        {/* Sources */}
        {message.sources && <SourcesPanel sources={message.sources} />}
      </div>
    </div>
  )
}

function StreamingCursor() {
  return (
    <span className="inline-block w-0.5 h-4 bg-teal-500 ml-0.5 animate-pulse align-middle" />
  )
}
