import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchIngestionRuns,
  fetchIngestionSources,
  triggerSource,
  triggerAllSources,
} from '@/api/admin'
import type { IngestionRun, IngestionSource } from '@/api/admin'
import Spinner from '@/components/Spinner'

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: 'bg-emerald-100 text-emerald-700',
    no_change: 'bg-slate-100 text-slate-500',
    running: 'bg-blue-100 text-blue-700',
    error: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function fmtDuration(s: number | null): string {
  if (s === null) return '—'
  if (s < 60) return `${s}s`
  return `${Math.round(s / 60)}m`
}

function SourceCard({ source, onTrigger, loading }: {
  source: IngestionSource
  onTrigger: () => void
  loading: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-slate-800 text-sm leading-tight">{source.name}</div>
          <div className="text-xs text-slate-500 mt-0.5">{source.jurisdiction}</div>
        </div>
        <span className="text-xs text-slate-400 shrink-0">every {source.check_interval_hours}h</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {source.tags.map(t => (
          <span key={t} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{t}</span>
        ))}
      </div>

      <div className="text-xs text-slate-400">
        {source.last_checked
          ? `Checked ${fmtTime(source.last_checked)}`
          : 'Never checked'}
      </div>

      {source.content_hash && (
        <div className="text-xs text-slate-400 font-mono">
          hash: {source.content_hash.slice(0, 10)}…
        </div>
      )}

      <button
        onClick={onTrigger}
        disabled={loading}
        className="mt-auto w-full py-1.5 text-xs font-medium bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Triggered…' : 'Trigger now'}
      </button>
    </div>
  )
}

export default function IngestionPanel() {
  const qc = useQueryClient()
  const [triggered, setTriggered] = useState<Set<string>>(new Set())

  const sources = useQuery({ queryKey: ['ingestion-sources'], queryFn: fetchIngestionSources })
  const runs = useQuery({ queryKey: ['ingestion-runs'], queryFn: () => fetchIngestionRuns(50) })

  const triggerOne = useMutation({
    mutationFn: triggerSource,
    onSuccess: (_, name) => {
      setTriggered(prev => new Set(prev).add(name))
      setTimeout(() => {
        setTriggered(prev => { const s = new Set(prev); s.delete(name); return s })
        qc.invalidateQueries({ queryKey: ['ingestion-runs'] })
      }, 3000)
    },
  })

  const triggerAll = useMutation({
    mutationFn: triggerAllSources,
    onSuccess: () => {
      setTimeout(() => qc.invalidateQueries({ queryKey: ['ingestion-runs'] }), 3000)
    },
  })

  const isLoading = sources.isLoading || runs.isLoading

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="space-y-6">
      {/* Sources grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-slate-800">
            Monitored sources ({sources.data?.count ?? 0})
          </div>
          <button
            onClick={() => triggerAll.mutate()}
            disabled={triggerAll.isPending}
            className="px-4 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {triggerAll.isPending ? 'Triggering…' : 'Trigger all'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sources.data?.sources.map(s => (
            <SourceCard
              key={s.name}
              source={s}
              loading={triggered.has(s.name) || triggerOne.isPending}
              onTrigger={() => triggerOne.mutate(s.name)}
            />
          ))}
        </div>
      </div>

      {/* Run history */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="font-semibold text-slate-800">
            Run history ({runs.data?.total ?? 0} total)
          </div>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['ingestion-runs'] })}
            className="text-xs text-teal-600 hover:text-teal-800"
          >
            Refresh
          </button>
        </div>

        {!runs.data?.runs.length ? (
          <div className="text-slate-400 text-sm text-center py-8">No runs yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Source</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500">Status</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500">Found</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500">Updated</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">Started</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">Duration</th>
                </tr>
              </thead>
              <tbody>
                {runs.data.runs.map((run: IngestionRun) => (
                  <tr key={run.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 text-slate-700 max-w-xs truncate">
                      {run.source_name}
                      {run.error_message && (
                        <div className="text-xs text-red-500 truncate max-w-xs" title={run.error_message}>
                          {run.error_message.slice(0, 80)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center"><StatusPill status={run.status} /></td>
                    <td className="px-4 py-2.5 text-center text-slate-600">{run.policies_found ?? 0}</td>
                    <td className="px-4 py-2.5 text-center text-slate-600">{run.policies_updated ?? 0}</td>
                    <td className="px-4 py-2.5 text-right text-slate-500 whitespace-nowrap">{fmtTime(run.started_at)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-500">{fmtDuration(run.duration_s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
