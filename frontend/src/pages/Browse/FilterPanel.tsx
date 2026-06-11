import { useEffect, useState } from 'react'
import type { PolicyFilters, JurisdictionType, PolicyStatus } from '@/types'

const jurisdictionTypeOptions: { value: JurisdictionType | ''; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'national_india', label: 'National India' },
  { value: 'indian_state', label: 'Indian State' },
  { value: 'indian_ut', label: 'Indian UT' },
  { value: 'global_market', label: 'Global Market' },
]

const statusOptions: { value: PolicyStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'expired', label: 'Expired' },
  { value: 'under_review', label: 'Under Review' },
]

const sortOptions = [
  { value: 'jurisdiction', label: 'Jurisdiction' },
  { value: 'title', label: 'Title' },
  { value: 'updated_at', label: 'Last Updated' },
  { value: 'confidence', label: 'Confidence' },
]

interface Props {
  filters: PolicyFilters
  onChange: (f: Partial<PolicyFilters>) => void
}

export default function FilterPanel({ filters, onChange }: Props) {
  const [searchDraft, setSearchDraft] = useState(filters.search ?? '')

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchDraft !== (filters.search ?? '')) {
        onChange({ search: searchDraft || undefined, page: 1 })
      }
    }, 350)
    return () => clearTimeout(t)
  }, [searchDraft])

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-4">
      {/* Search */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Search</label>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchDraft}
            onChange={e => setSearchDraft(e.target.value)}
            placeholder="Search policies…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Jurisdiction Type */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Jurisdiction Type</label>
        <select
          value={filters.jurisdiction_type ?? ''}
          onChange={e => onChange({ jurisdiction_type: (e.target.value as JurisdictionType | ''), page: 1 })}
          className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        >
          {jurisdictionTypeOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
        <select
          value={filters.status ?? ''}
          onChange={e => onChange({ status: (e.target.value as PolicyStatus | ''), page: 1 })}
          className="w-full py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        >
          {statusOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Sort */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Sort by</label>
        <div className="flex gap-2">
          <select
            value={filters.sort_by ?? 'jurisdiction'}
            onChange={e => onChange({ sort_by: e.target.value, page: 1 })}
            className="flex-1 py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          >
            {sortOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => onChange({ sort_dir: filters.sort_dir === 'asc' ? 'desc' : 'asc', page: 1 })}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
            title={filters.sort_dir === 'asc' ? 'Ascending' : 'Descending'}
          >
            {filters.sort_dir === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Clear */}
      <button
        onClick={() => onChange({ jurisdiction_type: '', status: '', search: undefined, sort_by: 'jurisdiction', sort_dir: 'asc', page: 1 })}
        className="text-sm text-teal-700 hover:text-teal-900 font-medium text-left"
      >
        Clear filters
      </button>
    </div>
  )
}
