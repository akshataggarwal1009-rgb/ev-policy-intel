import Badge from './Badge'
import type { JurisdictionType } from '@/types'

const map: Record<JurisdictionType, { label: string; variant: 'teal' | 'blue' | 'purple' | 'orange' }> = {
  indian_state:   { label: 'State',    variant: 'teal'   },
  indian_ut:      { label: 'UT',       variant: 'blue'   },
  national_india: { label: 'National', variant: 'purple' },
  global_market:  { label: 'Global',   variant: 'orange' },
}

export default function JurisdictionTypeBadge({ type }: { type: JurisdictionType }) {
  const { label, variant } = map[type] ?? { label: type, variant: 'teal' }
  return <Badge label={label} variant={variant} />
}
