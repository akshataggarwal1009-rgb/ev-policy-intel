import clsx from 'clsx'

interface Props {
  page: number
  pages: number
  total: number
  pageSize: number
  onChange: (p: number) => void
}

export default function Pagination({ page, pages, total, pageSize, onChange }: Props) {
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const range: (number | '...')[] = []
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) range.push(i)
  } else {
    range.push(1)
    if (page > 3) range.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) range.push(i)
    if (page < pages - 2) range.push('...')
    range.push(pages)
  }

  return (
    <div className="flex items-center justify-between px-1 py-3">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-700">{from}–{to}</span> of{' '}
        <span className="font-medium text-slate-700">{total}</span> results
      </p>
      <div className="flex gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="px-2.5 py-1.5 text-sm rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ‹
        </button>
        {range.map((r, i) =>
          r === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2.5 py-1.5 text-sm text-slate-400">…</span>
          ) : (
            <button
              key={r}
              onClick={() => onChange(r)}
              className={clsx(
                'px-2.5 py-1.5 text-sm rounded-md border',
                r === page
                  ? 'border-teal-600 bg-teal-600 text-white font-medium'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {r}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === pages}
          className="px-2.5 py-1.5 text-sm rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ›
        </button>
      </div>
    </div>
  )
}
