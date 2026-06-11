import type { PolicyStats } from '@/types'

interface Props {
  stats: PolicyStats
}

export default function StatsBar({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard label="Total Policies" value={stats.total_policies} color="teal" />
      <StatCard label="Active Policies" value={stats.active_policies} color="green" />
      <StatCard label="Total Incentives" value={stats.total_incentives} color="blue" />
      <StatCard label="Jurisdictions" value={Object.keys(stats.by_jurisdiction_type).length > 0
        ? stats.top_jurisdictions.length
        : 0} color="purple" />
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    teal:   'text-teal-600 bg-teal-50',
    green:  'text-green-600 bg-green-50',
    blue:   'text-blue-600 bg-blue-50',
    purple: 'text-purple-600 bg-purple-50',
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorMap[color] ?? 'text-slate-800 bg-slate-50'} px-1 rounded`}>
        {value.toLocaleString()}
      </p>
    </div>
  )
}
