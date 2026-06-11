import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchComparison } from '@/api/compare'
import { fetchJurisdictions } from '@/api/policies'
import JurisdictionPicker from './JurisdictionPicker'
import CompareTable from './CompareTable'
import SummaryStrip from './SummaryStrip'

// Suggested preset comparisons
const PRESETS = [
  { label: 'Top EV states', jurisdictions: ['Delhi', 'Maharashtra', 'Karnataka', 'Gujarat'] },
  { label: 'South India', jurisdictions: ['Karnataka', 'Tamil Nadu', 'Kerala', 'Andhra Pradesh'] },
  { label: 'India vs. Norway', jurisdictions: ['India (National)', 'Norway'] },
  { label: 'Global leaders', jurisdictions: ['Norway', 'China', 'United States', 'Germany'] },
]

export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Parse initial selection from URL ?j=Delhi,Maharashtra
  const initialJ = (searchParams.get('j') ?? '').split(',').filter(Boolean)
  const [selected, setSelected] = useState<string[]>(initialJ.slice(0, 4))

  // Sync selection to URL
  useEffect(() => {
    if (selected.length > 0) setSearchParams({ j: selected.join(',') }, { replace: true })
    else setSearchParams({}, { replace: true })
  }, [selected])

  // All jurisdictions for the picker
  const { data: allJurisdictions = [] } = useQuery<string[]>({
    queryKey: ['jurisdictions'],
    queryFn: () => fetchJurisdictions(),
  })

  // Fetch comparison data when 2+ selected
  const canCompare = selected.length >= 2
  const {
    data: comparison,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ['compare', selected.join(',')],
    queryFn: () => fetchComparison(selected),
    enabled: canCompare,
    staleTime: 60_000,
  })

  function applyPreset(jurisdictions: string[]) {
    // Only keep those that exist in our data
    setSelected(jurisdictions.slice(0, 4))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link to="/" className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Policy Comparator</h1>
            <p className="text-xs text-slate-500">Side-by-side comparison across 2–4 jurisdictions</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Picker card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Select Jurisdictions
              </label>
              <JurisdictionPicker
                options={allJurisdictions}
                selected={selected}
                onChange={setSelected}
              />
            </div>
            {selected.length > 0 && (
              <button
                onClick={() => setSelected([])}
                className="text-xs text-slate-400 hover:text-slate-600 self-center sm:self-start sm:mt-6 whitespace-nowrap"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Presets */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-slate-400 self-center">Quick picks:</span>
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.jurisdictions)}
                className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition-colors border border-transparent hover:border-teal-200"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* States */}
        {!canCompare && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-slate-700 font-semibold">Select at least 2 jurisdictions</p>
            <p className="text-slate-400 text-sm max-w-sm">
              Search for states, union territories, or countries above, or choose a quick pick preset to begin comparing.
            </p>
          </div>
        )}

        {canCompare && isFetching && (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-500">
            <svg className="w-5 h-5 animate-spin text-teal-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-sm">Loading comparison data…</span>
          </div>
        )}

        {canCompare && isError && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center">
            <p className="text-red-700 font-semibold mb-1">Failed to load comparison</p>
            <p className="text-red-500 text-sm">
              {(error as Error)?.message ?? 'Unknown error — check that the backend is running.'}
            </p>
          </div>
        )}

        {canCompare && comparison && !isFetching && (
          <>
            {/* Summary strip */}
            <SummaryStrip data={comparison.jurisdictions} />

            {/* Comparison table */}
            <CompareTable data={comparison.jurisdictions} />

            {/* Footer help */}
            <p className="text-center text-xs text-slate-400 pb-4">
              ↑best marks the highest value in each row across selected jurisdictions. — means no data available.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
