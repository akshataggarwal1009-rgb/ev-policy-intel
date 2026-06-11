import { Link } from 'react-router-dom'
import type { StateMapData } from '@/types/map'

interface Props {
  state: StateMapData | null
  onClose: () => void
}

const formatINR = (v: number | null) => {
  if (!v) return '—'
  if (v >= 10_00_000) return `₹${(v / 10_00_000).toFixed(1)}L`
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)}K`
  return `₹${v}`
}

export default function StateInfoPanel({ state, onClose }: Props) {
  if (!state) return null

  const features = [
    { label: 'Purchase Subsidy', active: state.has_purchase_subsidy },
    { label: 'Road Tax Waiver', active: state.has_road_tax_waiver },
    { label: 'Charging Infra Support', active: state.has_charging_infra },
    { label: 'Manufacturing Incentive', active: state.has_manufacturing },
  ]

  return (
    <div className="absolute top-4 right-4 bottom-4 w-72 bg-white rounded-xl border border-slate-200 shadow-lg z-10 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-slate-100">
        <div>
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-0.5">
            {state.jurisdiction_type.replace('_', ' ')}
          </p>
          <h3 className="text-base font-bold text-slate-900">{state.jurisdiction}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
        >
          ✕
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        {[
          { label: 'Policies', value: state.policy_count },
          { label: 'Active', value: state.active_count },
          { label: 'Incentives', value: state.incentive_count },
        ].map(s => (
          <div key={s.label} className="py-3 text-center">
            <p className="text-xl font-bold text-teal-600">{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Max subsidy */}
      {state.max_subsidy_inr && (
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs text-slate-400 mb-0.5">Max purchase subsidy</p>
          <p className="text-lg font-bold text-slate-800">{formatINR(state.max_subsidy_inr)}</p>
        </div>
      )}

      {/* Feature checklist */}
      <div className="px-4 py-3 flex-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Coverage</p>
        <div className="flex flex-col gap-2">
          {features.map(f => (
            <div key={f.label} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                f.active ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-300'
              }`}>
                {f.active ? (
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                  </svg>
                ) : (
                  <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                  </svg>
                )}
              </div>
              <span className={`text-sm ${f.active ? 'text-slate-700' : 'text-slate-400'}`}>
                {f.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
        <Link
          to={`/browse?jurisdiction=${encodeURIComponent(state.jurisdiction)}`}
          className="block w-full py-2 text-center text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          View Policies →
        </Link>
        <Link
          to={`/compare?j=${encodeURIComponent(state.jurisdiction)}`}
          className="block w-full py-2 text-center text-sm font-medium bg-white border border-teal-200 text-teal-700 rounded-lg hover:bg-teal-50 transition-colors"
        >
          Compare →
        </Link>
      </div>
    </div>
  )
}
