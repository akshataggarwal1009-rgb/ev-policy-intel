import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { StateMapData } from '@/types/map'
import { fetchPolicies } from '@/api/policies'
import StatusBadge from '@/components/StatusBadge'
import Spinner from '@/components/Spinner'

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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const { data: policiesData, isLoading } = useQuery({
    queryKey: ['statePolicies', state?.jurisdiction],
    queryFn: () => fetchPolicies({ jurisdiction: state!.jurisdiction, page_size: 20 }),
    enabled: !!state,
    staleTime: 5 * 60_000,
  })

  if (!state) return null

  const policies = policiesData?.items ?? []

  function togglePolicy(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const features = [
    { label: 'Purchase Subsidy', active: state.has_purchase_subsidy },
    { label: 'Road Tax Waiver', active: state.has_road_tax_waiver },
    { label: 'Charging Infra', active: state.has_charging_infra },
    { label: 'Manufacturing', active: state.has_manufacturing },
  ]

  return (
    <div className="absolute top-4 right-4 bottom-4 w-80 bg-white rounded-xl border border-slate-200 shadow-lg z-10 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-slate-100 flex-shrink-0">
        <div>
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-0.5">
            {state.jurisdiction_type.replace(/_/g, ' ')}
          </p>
          <h3 className="text-base font-bold text-slate-900">{state.jurisdiction}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex-shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 flex-shrink-0">
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

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Subsidy + coverage */}
        <div className="px-4 py-3 border-b border-slate-100">
          {state.max_subsidy_inr && (
            <div className="mb-3">
              <p className="text-xs text-slate-400 mb-0.5">Max purchase subsidy</p>
              <p className="text-lg font-bold text-slate-800">{formatINR(state.max_subsidy_inr)}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {features.map(f => (
              <div key={f.label} className="flex items-center gap-1.5">
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  f.active ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-300'
                }`}>
                  {f.active ? (
                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                  ) : (
                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                    </svg>
                  )}
                </div>
                <span className={`text-xs ${f.active ? 'text-slate-600' : 'text-slate-400'}`}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Policies list */}
        <div className="px-4 pt-3 pb-1 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Policies</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : (
          <div className="px-4 pb-4 flex flex-col gap-2.5 mt-2">
            {policies.map(policy => {
              const expanded = expandedIds.has(policy.id)
              return (
                <div key={policy.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors"
                    onClick={() => togglePolicy(policy.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <StatusBadge status={policy.status} />
                          <span className="text-xs text-slate-400">{policy.incentive_count} incentives</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 leading-snug">{policy.title}</p>
                        {policy.effective_date && (
                          <p className="text-xs text-slate-400 mt-1">
                            From {new Date(policy.effective_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}
                          </p>
                        )}
                      </div>
                      <svg
                        className={`w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-slate-100 bg-slate-50 px-3 py-3 flex flex-col gap-2.5">
                      <p className="text-xs text-slate-600 leading-relaxed">{policy.summary}</p>

                      {policy.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {policy.tags.map(tag => (
                            <span key={tag} className="text-xs px-1.5 py-0.5 bg-white border border-slate-200 text-slate-500 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-0.5">
                        {policy.source_url && (
                          <a
                            href={policy.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800"
                          >
                            Official Source
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                        <Link
                          to={`/policy/${policy.id}`}
                          className="ml-auto text-xs text-teal-600 hover:text-teal-800 font-medium"
                        >
                          Full details →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* CTAs */}
      <div className="p-4 border-t border-slate-100 flex flex-col gap-2 flex-shrink-0">
        <Link
          to={`/browse?jurisdiction=${encodeURIComponent(state.jurisdiction)}`}
          className="block w-full py-2 text-center text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          View All Policies →
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
