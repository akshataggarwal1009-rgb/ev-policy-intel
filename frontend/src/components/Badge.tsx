import clsx from 'clsx'

type Variant = 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'teal' | 'purple' | 'orange'

const variants: Record<Variant, string> = {
  green:  'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red:    'bg-red-100 text-red-800',
  gray:   'bg-slate-100 text-slate-600',
  blue:   'bg-blue-100 text-blue-800',
  teal:   'bg-teal-100 text-teal-800',
  purple: 'bg-purple-100 text-purple-800',
  orange: 'bg-orange-100 text-orange-800',
}

interface Props {
  label: string
  variant?: Variant
  className?: string
}

export default function Badge({ label, variant = 'gray', className }: Props) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {label}
    </span>
  )
}
