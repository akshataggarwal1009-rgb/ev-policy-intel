import { useQuery } from '@tanstack/react-query'
import { fetchAnalyticsSummary } from '@/api/admin'
import Spinner from '@/components/Spinner'
import StatCard from './StatCard'

function DailyChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const last14 = data.slice(-14)

  return (
    <div>
      <div className="flex items-end gap-0.5 h-20">
        {last14.map(({ date, count }) => {
          const pct = Math.round((count / max) * 100)
          return (
            <div
              key={date}
              className="flex-1 flex flex-col items-center justify-end group relative"
            >
              <div
                className="w-full bg-teal-400 rounded-t transition-all group-hover:bg-teal-600"
                style={{ height: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
              />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                {date.slice(5)}: {count}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between mt-1 text-xs text-slate-400">
        <span>{last14[0]?.date.slice(5)}</span>
        <span>Last 14 days</span>
        <span>{last14[last14.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  )
}

const EVENT_LABELS: Record<string, string> = {
  chat_message: 'Chat messages',
  list_policies: 'Policy list views',
  view_policy: 'Policy detail views',
  list_incentives: 'Incentive searches',
}

function EventBreakdown({ breakdown }: { breakdown: Record<string, number> }) {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0)
  const entries = Object.entries(breakdown).sort(([, a], [, b]) => b - a)

  return (
    <div className="space-y-2">
      {entries.map(([type, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div key={type}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-700">{EVENT_LABELS[type] ?? type}</span>
              <span className="text-slate-500 font-medium">{count} <span className="text-slate-400 text-xs">({pct}%)</span></span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-400 rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
      {entries.length === 0 && <div className="text-slate-400 text-sm">No events recorded yet.</div>}
    </div>
  )
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function UsagePanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: fetchAnalyticsSummary,
  })

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (error) return <div className="text-red-500 text-sm py-8 text-center">Failed to load analytics.</div>
  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Events (7d)" value={data.events_7d} sub={`${data.events_30d} last 30d`} />
        <StatCard label="Chat queries (7d)" value={data.chat_7d} sub={`${data.chat_30d} last 30d`} accent />
        <StatCard label="Unique sessions (7d)" value={data.unique_sessions_7d} sub={`${data.unique_sessions_30d} last 30d`} />
        <StatCard
          label="Tokens used"
          value={fmtTokens(data.total_prompt_tokens + data.total_completion_tokens)}
          sub={`${fmtTokens(data.total_prompt_tokens)} prompt · ${fmtTokens(data.total_completion_tokens)} completion`}
        />
      </div>

      {/* Activity chart */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="font-semibold text-slate-800 mb-4">Daily activity (last 14 days)</div>
        <DailyChart data={data.daily_events_30d} />
      </div>

      {/* Event breakdown */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="font-semibold text-slate-800 mb-4">Event breakdown (30d)</div>
          <EventBreakdown breakdown={data.event_breakdown_30d} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="font-semibold text-slate-800 mb-4">Top jurisdictions filtered (30d)</div>
          {data.top_jurisdictions_30d.length === 0 ? (
            <div className="text-slate-400 text-sm">No jurisdiction filters recorded yet.</div>
          ) : (
            <ol className="space-y-2">
              {data.top_jurisdictions_30d.map((j, i) => (
                <li key={j.jurisdiction} className="flex items-center gap-3 text-sm">
                  <span className="w-5 text-slate-400 text-xs font-bold text-right shrink-0">{i + 1}.</span>
                  <span className="flex-1 text-slate-700 truncate">{j.jurisdiction}</span>
                  <span className="text-slate-500 font-medium shrink-0">{j.count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Top queries */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="font-semibold text-slate-800 mb-4">Top chat queries (30d)</div>
        {data.top_queries_30d.length === 0 ? (
          <div className="text-slate-400 text-sm">No chat queries recorded yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left pb-2 text-slate-500 font-medium">#</th>
                <th className="text-left pb-2 text-slate-500 font-medium">Query</th>
                <th className="text-right pb-2 text-slate-500 font-medium">Count</th>
              </tr>
            </thead>
            <tbody>
              {data.top_queries_30d.map((q, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-2 pr-3 text-slate-400 text-xs">{i + 1}</td>
                  <td className="py-2 text-slate-700 max-w-xs truncate pr-4">{q.query}</td>
                  <td className="py-2 text-right text-slate-600 font-medium">{q.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
