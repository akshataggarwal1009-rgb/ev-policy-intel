import type { ChatSources } from '@/types/chat'
import clsx from 'clsx'

interface Props {
  sources: ChatSources
}

const modeLabel: Record<string, string> = {
  vector: 'Semantic search',
  keyword: 'Keyword search',
  none: 'No retrieval',
}

const modeColor: Record<string, string> = {
  vector: 'text-teal-600',
  keyword: 'text-blue-600',
  none: 'text-slate-400',
}

export default function SourcesPanel({ sources }: Props) {
  if (!sources.policies.length && sources.incentive_count === 0) return null

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sources retrieved</p>
        <span className={clsx('text-xs font-medium', modeColor[sources.retrieval_mode])}>
          {modeLabel[sources.retrieval_mode]}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {sources.policies.map((p, i) => (
          <div key={i} className="flex items-start gap-2 group">
            <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-700 truncate">{p.title}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{p.jurisdiction}</span>
                {p.source_url && (
                  <a
                    href={p.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-teal-600 hover:underline hidden group-hover:inline"
                  >
                    ↗ source
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {sources.incentive_count > 0 && (
        <p className="mt-2 text-xs text-slate-400">
          + {sources.incentive_count} incentive{sources.incentive_count !== 1 ? 's' : ''} referenced
        </p>
      )}
    </div>
  )
}
