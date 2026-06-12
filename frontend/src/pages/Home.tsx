import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchPolicyStats } from '@/api/policies'
import { fetchMapData } from '@/api/map'
import Spinner from '@/components/Spinner'

const formatINR = (v: number) => {
  if (v >= 10_00_000) return `₹${(v / 10_00_000).toFixed(1)}L`
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)}K`
  return `₹${v}`
}

const TYPE_META: Record<string, { label: string; color: string }> = {
  indian_state:   { label: 'Indian States', color: 'bg-teal-500' },
  national_india: { label: 'National India', color: 'bg-blue-500' },
  global_market:  { label: 'Global Markets', color: 'bg-violet-500' },
  indian_ut:      { label: 'Union Territories', color: 'bg-amber-500' },
}

// SVG donut — no library needed
function Donut({ segments }: { segments: { value: number; color: string }[] }) {
  const total = segments.reduce((s, g) => s + g.value, 0)
  const r = 36
  const cx = 44
  const cy = 44
  const circ = 2 * Math.PI * r

  let offset = 0
  const slices = segments.map(seg => {
    const dash = (seg.value / total) * circ
    const gap = circ - dash
    const slice = { dash, gap, offset, color: seg.color }
    offset += dash
    return slice
  })

  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="14" />
      {slices.map((s, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={s.color}
          strokeWidth="14"
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={-s.offset + circ * 0.25}
          style={{ transition: 'stroke-dasharray 0.4s' }}
        />
      ))}
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" className="text-xs font-bold fill-slate-700" fontSize="13" fontWeight="700">{total}</text>
    </svg>
  )
}

const DONUT_COLORS: Record<string, string> = {
  indian_state:   '#14b8a6',
  national_india: '#3b82f6',
  global_market:  '#8b5cf6',
  indian_ut:      '#f59e0b',
}

const nav = [
  { icon: '🗺️', title: 'India Map', desc: 'Choropleth map of incentive density', to: '/map' },
  { icon: '🗂️', title: 'Browse', desc: 'Filter and search all policies', to: '/browse' },
  { icon: '⚖️', title: 'Compare', desc: 'Side-by-side framework comparison', to: '/compare' },
  { icon: '💬', title: 'AI Assistant', desc: 'Ask questions in natural language', to: '/chat' },
]

export default function Home() {
  const { data: stats } = useQuery({ queryKey: ['policyStats'], queryFn: fetchPolicyStats, staleTime: 5 * 60_000 })
  const { data: mapData } = useQuery({ queryKey: ['mapData'], queryFn: fetchMapData, staleTime: 5 * 60_000 })

  const topStates = useMemo(() => {
    if (!mapData) return []
    return mapData.states
      .filter(s => s.jurisdiction_type === 'indian_state' || s.jurisdiction_type === 'indian_ut')
      .sort((a, b) => b.incentive_count - a.incentive_count)
      .slice(0, 8)
  }, [mapData])

  const coverage = useMemo(() => {
    if (!mapData) return null
    const indian = mapData.states.filter(s =>
      s.jurisdiction_type === 'indian_state' || s.jurisdiction_type === 'indian_ut'
    )
    const n = indian.length || 1
    return [
      { label: 'Purchase Subsidy',      pct: Math.round(indian.filter(s => s.has_purchase_subsidy).length / n * 100) },
      { label: 'Road Tax Waiver',        pct: Math.round(indian.filter(s => s.has_road_tax_waiver).length / n * 100) },
      { label: 'Charging Infra Support', pct: Math.round(indian.filter(s => s.has_charging_infra).length / n * 100) },
      { label: 'Manufacturing Incentive',pct: Math.round(indian.filter(s => s.has_manufacturing).length / n * 100) },
    ]
  }, [mapData])

  const maxSubsidy = useMemo(() => {
    if (!mapData) return null
    return mapData.states.reduce((m, s) => Math.max(m, s.max_subsidy_inr ?? 0), 0)
  }, [mapData])

  const maxBar = topStates[0]?.incentive_count ?? 1

  const donutSegments = stats
    ? Object.entries(stats.by_jurisdiction_type).map(([type, value]) => ({
        value,
        color: DONUT_COLORS[type] ?? '#94a3b8',
      }))
    : []

  const loading = !stats || !mapData

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
          <span className="w-2 h-2 rounded-full bg-teal-500" />
          India EV Policy Intelligence
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">Navigate India's EV Policy Landscape</h1>
        <p className="text-slate-500 max-w-xl mx-auto text-sm">
          Structured, queryable database of EV policies, incentives, and benchmarks — built for policymakers and researchers.
        </p>
        <div className="flex items-center justify-center gap-3 mt-5">
          <Link to="/map" className="px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
            Explore Map
          </Link>
          <Link to="/chat" className="px-5 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            Ask AI Assistant
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Policies',  value: stats!.total_policies,   sub: `${stats!.active_policies} active` },
              { label: 'Incentives',      value: stats!.total_incentives, sub: 'across all jurisdictions' },
              { label: 'Jurisdictions',   value: Object.values(stats!.by_jurisdiction_type).reduce((a,b)=>a+b,0), sub: 'states, UTs & global' },
              { label: 'Max Subsidy',     value: formatINR(maxSubsidy!),  sub: 'highest single incentive' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-2xl font-bold text-teal-600">{k.value}</p>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">{k.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Top states bar chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Top States by Incentives</h2>
              <div className="flex flex-col gap-2.5">
                {topStates.map(s => (
                  <Link key={s.jurisdiction} to={`/browse?jurisdiction=${encodeURIComponent(s.jurisdiction)}`} className="group flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-24 shrink-0 truncate group-hover:text-teal-600">{s.jurisdiction}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-teal-500 h-2 rounded-full transition-all group-hover:bg-teal-600"
                        style={{ width: `${(s.incentive_count / maxBar) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-600 w-4 text-right shrink-0">{s.incentive_count}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Policy mix donut */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Policy Coverage Mix</h2>
              <div className="flex items-center gap-5">
                <Donut segments={donutSegments} />
                <div className="flex flex-col gap-2.5 flex-1">
                  {Object.entries(stats!.by_jurisdiction_type).map(([type, count]) => {
                    const meta = TYPE_META[type] ?? { label: type, color: 'bg-slate-400' }
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${meta.color}`} />
                        <span className="text-xs text-slate-600 flex-1">{meta.label}</span>
                        <span className="text-xs font-semibold text-slate-700">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Coverage breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Incentive Coverage — Indian States &amp; UTs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {coverage!.map(c => (
                <div key={c.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-600">{c.label}</span>
                    <span className="text-xs font-semibold text-teal-600">{c.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full">
                    <div
                      className="h-1.5 bg-teal-500 rounded-full transition-all"
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nav cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {nav.map(f => (
              <Link
                key={f.to}
                to={f.to}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-300 hover:shadow-sm transition-all group"
              >
                <div className="text-xl mb-2">{f.icon}</div>
                <h3 className="text-sm font-semibold text-slate-900 mb-0.5 group-hover:text-teal-700">{f.title}</h3>
                <p className="text-xs text-slate-400">{f.desc}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
