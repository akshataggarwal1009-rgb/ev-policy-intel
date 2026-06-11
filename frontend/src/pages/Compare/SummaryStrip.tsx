import clsx from 'clsx'
import type { JurisdictionCompareData } from '@/api/compare'
import { SLOT_COLORS } from './JurisdictionPicker'

interface Props {
  data: JurisdictionCompareData[]
}

export default function SummaryStrip({ data }: Props) {
  return (
    <div className={clsx(
      'grid gap-4',
      data.length === 2 ? 'grid-cols-2' : data.length === 3 ? 'grid-cols-3' : 'grid-cols-4'
    )}>
      {data.map((d, i) => {
        const color = SLOT_COLORS[i]
        return (
          <div
            key={d.jurisdiction}
            className={clsx(
              'rounded-2xl p-4 border',
              color.light, color.border,
            )}
          >
            <div className="flex items-start gap-2 mb-2">
              <span className={clsx('w-3 h-3 rounded-full mt-1 flex-shrink-0', color.bg)} />
              <div>
                <p className={clsx('font-bold text-base leading-tight', color.text)}>
                  {d.jurisdiction}
                </p>
                {d.jurisdiction_type && (
                  <p className="text-xs text-slate-500 capitalize">
                    {d.jurisdiction_type.replace('_', ' ')}
                  </p>
                )}
              </div>
            </div>
            {d.primary_policy && (
              <p className="text-xs text-slate-600 leading-snug line-clamp-3 mt-2">
                {d.primary_policy.summary}
              </p>
            )}
            {!d.found && (
              <p className="text-xs text-slate-400 italic mt-2">No policy data available</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
