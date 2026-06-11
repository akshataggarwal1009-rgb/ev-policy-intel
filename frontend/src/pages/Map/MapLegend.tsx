import type { MapMetric } from '@/types/map'
import { getLegendStops } from './mapUtils'

interface Props {
  metric: MapMetric
  maxValue: number
}

const METRIC_LABELS: Record<MapMetric, string> = {
  incentive_count: 'Incentives',
  policy_count: 'Policies',
  max_subsidy_inr: 'Max Purchase Subsidy',
}

export default function MapLegend({ metric, maxValue }: Props) {
  const stops = getLegendStops(maxValue, metric)

  return (
    <div className="absolute bottom-4 left-4 bg-white rounded-xl border border-slate-200 shadow-sm p-3 z-10">
      <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
        {METRIC_LABELS[metric]}
      </p>
      <div className="flex flex-col gap-1">
        {stops.map(stop => (
          <div key={stop.label} className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: stop.color }} />
            <span className="text-xs text-slate-600">{stop.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
