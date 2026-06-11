import { useState, useRef, useEffect } from 'react'
import clsx from 'clsx'

// Jurisdiction colors — one per slot (up to 4)
export const SLOT_COLORS = [
  { bg: 'bg-teal-500',   light: 'bg-teal-50',   border: 'border-teal-300',  text: 'text-teal-700',  ring: 'ring-teal-400'  },
  { bg: 'bg-violet-500', light: 'bg-violet-50',  border: 'border-violet-300', text: 'text-violet-700', ring: 'ring-violet-400' },
  { bg: 'bg-amber-500',  light: 'bg-amber-50',   border: 'border-amber-300', text: 'text-amber-700',  ring: 'ring-amber-400'  },
  { bg: 'bg-rose-500',   light: 'bg-rose-50',    border: 'border-rose-300',  text: 'text-rose-700',   ring: 'ring-rose-400'   },
]

interface Props {
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
  maxSlots?: number
}

export default function JurisdictionPicker({ options, selected, onChange, maxSlots = 4 }: Props) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter(
    o => o.toLowerCase().includes(search.toLowerCase()) && !selected.includes(o)
  )

  function add(j: string) {
    if (selected.length < maxSlots && !selected.includes(j)) {
      onChange([...selected, j])
    }
    setSearch('')
  }

  function remove(j: string) {
    onChange(selected.filter(s => s !== j))
  }

  return (
    <div ref={ref} className="relative w-full">
      {/* Selected chips */}
      <div
        className={clsx(
          'flex flex-wrap gap-2 min-h-[44px] px-3 py-2 bg-white border border-slate-200 rounded-xl cursor-text',
          'transition-shadow focus-within:ring-2 focus-within:ring-teal-400 focus-within:border-transparent',
        )}
        onClick={() => setOpen(true)}
      >
        {selected.map((j, i) => {
          const color = SLOT_COLORS[i]
          return (
            <span
              key={j}
              className={clsx(
                'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
                color.light, color.text, 'border', color.border,
              )}
            >
              <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', color.bg)} />
              {j}
              <button
                onClick={e => { e.stopPropagation(); remove(j) }}
                className="ml-1 text-slate-400 hover:text-slate-600 font-bold leading-none"
                aria-label={`Remove ${j}`}
              >
                ×
              </button>
            </span>
          )
        })}
        {selected.length < maxSlots && (
          <input
            className="flex-1 min-w-[160px] bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
            placeholder={selected.length === 0 ? 'Search and select jurisdictions…' : 'Add another…'}
            value={search}
            onChange={e => { setSearch(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
          />
        )}
        <span className="ml-auto text-xs text-slate-400 self-center flex-shrink-0">
          {selected.length}/{maxSlots}
        </span>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">
              {selected.length >= maxSlots
                ? `Maximum ${maxSlots} jurisdictions reached`
                : 'No jurisdictions match your search'}
            </div>
          ) : (
            filtered.map(j => (
              <button
                key={j}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-800 transition-colors"
                onClick={() => add(j)}
              >
                {j}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
