import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMapData } from '@/api/map'
import type { MapMetric, StateMapData } from '@/types/map'
import IndiaMap from './IndiaMap'
import MapControls from './MapControls'
import MapLegend from './MapLegend'
import StateInfoPanel from './StateInfoPanel'
import Spinner from '@/components/Spinner'

export default function MapView() {
  const [metric, setMetric] = useState<MapMetric>('incentive_count')
  const [selected, setSelected] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['mapData'],
    queryFn: fetchMapData,
    staleTime: 5 * 60_000,
  })

  // Build O(1) lookup by jurisdiction name
  const stateIndex = useMemo<Map<string, StateMapData>>(() => {
    const map = new Map<string, StateMapData>()
    data?.states.forEach(s => map.set(s.jurisdiction, s))
    return map
  }, [data])

  const maxValue = useMemo(() => {
    if (!data) return 1
    if (metric === 'incentive_count') return data.meta.max_incentive_count
    if (metric === 'policy_count') return data.meta.max_policy_count
    return Math.max(...(data.states.map(s => s.max_subsidy_inr ?? 0)), 1)
  }, [data, metric])

  const selectedState = selected ? stateIndex.get(selected) ?? null : null

  function handleStateClick(jurisdiction: string) {
    setSelected(prev => (prev === jurisdiction ? null : jurisdiction))
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-900">India EV Policy Map</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {data ? `${data.meta.total_jurisdictions} jurisdictions with policy data` : 'Click a state to explore'}
          </p>
        </div>
        {data && (
          <div className="hidden sm:flex gap-3 text-xs text-slate-500">
            {data.states.slice(0, 3).map(s => (
              <span key={s.jurisdiction} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                {s.jurisdiction}: {s.incentive_count} incentives
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Map area */}
      <div className="flex-1 relative overflow-hidden bg-slate-100">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-20">
            <div className="text-center">
              <Spinner size="lg" />
              <p className="mt-3 text-sm text-slate-500">Loading policy data…</p>
            </div>
          </div>
        )}

        {isError && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="bg-white rounded-xl border border-red-200 p-6 text-center max-w-sm">
              <p className="text-red-700 font-medium">Could not load map data</p>
              <p className="text-red-500 text-sm mt-1">Make sure the backend is running on port 8000</p>
            </div>
          </div>
        )}

        {data && (
          <>
            <MapControls metric={metric} onChange={m => { setMetric(m); setSelected(null) }} />

            <div className={`absolute inset-0 transition-all ${selected ? 'right-80' : ''}`}>
              <IndiaMap
                stateIndex={stateIndex}
                metric={metric}
                maxValue={maxValue}
                selectedJurisdiction={selected}
                onStateClick={handleStateClick}
              />
            </div>

            <MapLegend metric={metric} maxValue={maxValue} />

            <StateInfoPanel state={selectedState} onClose={() => setSelected(null)} />

            {/* No-data states hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <p className="text-xs text-slate-400 bg-white/80 px-3 py-1 rounded-full border border-slate-200 backdrop-blur-sm">
                Scroll to zoom · Drag to pan · Click a state for details
              </p>
            </div>
          </>
        )}
      </div>

      {/* Bottom stats strip */}
      {data && (
        <div className="bg-white border-t border-slate-200 px-4 py-2 flex items-center gap-6 overflow-x-auto">
          <p className="text-xs font-semibold text-slate-500 shrink-0">Top states by incentives:</p>
          {data.states.slice(0, 8).map(s => (
            <button
              key={s.jurisdiction}
              onClick={() => handleStateClick(s.jurisdiction)}
              className={`flex items-center gap-1.5 text-xs shrink-0 px-2 py-1 rounded-full transition-colors ${
                selected === s.jurisdiction
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="font-medium">{s.jurisdiction}</span>
              <span className={selected === s.jurisdiction ? 'text-teal-200' : 'text-slate-400'}>
                {s.incentive_count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
