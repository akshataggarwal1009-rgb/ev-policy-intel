import Badge from './Badge'
import type { PolicyStatus } from '@/types'

const map: Record<PolicyStatus, { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' }> = {
  active:       { label: 'Active',        variant: 'green'  },
  draft:        { label: 'Draft',         variant: 'yellow' },
  expired:      { label: 'Expired',       variant: 'red'    },
  under_review: { label: 'Under Review',  variant: 'yellow' },
}

export default function StatusBadge({ status }: { status: PolicyStatus }) {
  const { label, variant } = map[status] ?? { label: status, variant: 'gray' }
  return <Badge label={label} variant={variant} />
}
