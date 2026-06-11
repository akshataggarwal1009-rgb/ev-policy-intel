import clsx from 'clsx'
import type { MapMetric } from '@/types/map'

interface Props {
  metric: MapMetric
  onChange: (m: MapMetric) => void
}

const OPTIONS: { value: MapMetric; label: string }[] = [
  { value: 'incentive_count', label: 'Incentives' },
  { value: 'policy_count', label: 'Policies' },
  { value: 'max_subsidy_inr', label: 'Max Subsidy' },
]

export default function MapControls({ metric, onChange }: Props) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white rounded-lg border border-slate-200 shadow-sm flex">
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={clsx(
            'px-4 py-2 text-xs font-medium first:rounded-l-lg last:rounded-r-lg transition-colors',
            metric === opt.value
              ? 'bg-teal-600 text-white'
              : 'text-slate-600 hover:bg-slate-50'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
