import type { Incentive } from '@/types'
import Badge from '@/components/Badge'

const categoryLabel: Record<string, string> = {
  purchase_subsidy:       'Purchase Subsidy',
  tax_exemption:          'Tax Exemption',
  registration_waiver:    'Registration Waiver',
  charging_infra:         'Charging Infra',
  fleet_incentive:        'Fleet Incentive',
  scrappage:              'Scrappage',
  rd_grant:               'R&D Grant',
  manufacturing_incentive:'Manufacturing',
  other:                  'Other',
}

const categoryColor: Record<string, 'teal' | 'green' | 'blue' | 'purple' | 'orange' | 'yellow' | 'gray'> = {
  purchase_subsidy:       'green',
  tax_exemption:          'blue',
  registration_waiver:    'teal',
  charging_infra:         'purple',
  fleet_incentive:        'orange',
  scrappage:              'yellow',
  rd_grant:               'blue',
  manufacturing_incentive:'gray',
  other:                  'gray',
}

const segmentLabel: Record<string, string> = {
  '2w': '2-Wheeler', '3w': '3-Wheeler', '4w': '4-Wheeler',
  commercial: 'Commercial', bus: 'Bus', all: 'All Segments',
}

interface Props {
  incentive: Incentive
}

export default function IncentiveCard({ incentive: inc }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <Badge
          label={categoryLabel[inc.category] ?? inc.category}
          variant={categoryColor[inc.category] ?? 'gray'}
        />
        {inc.is_stackable && (
          <Badge label="Stackable" variant="teal" />
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-800 leading-snug">{inc.title}</h4>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{inc.description}</p>
      </div>

      {inc.value_text && (
        <div className="bg-teal-50 rounded-lg px-3 py-2">
          <p className="text-xs font-medium text-teal-800">{inc.value_text}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="bg-slate-100 px-2 py-0.5 rounded-full">
          {segmentLabel[inc.vehicle_segment] ?? inc.vehicle_segment}
        </span>
        {inc.beneficiary && (
          <span className="bg-slate-100 px-2 py-0.5 rounded-full capitalize">{inc.beneficiary}</span>
        )}
      </div>
    </div>
  )
}
