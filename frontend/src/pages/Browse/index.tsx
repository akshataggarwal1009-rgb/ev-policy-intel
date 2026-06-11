import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { fetchPolicies, fetchPolicyStats } from '@/api/policies'
import type { PolicyFilters } from '@/types'
import FilterPanel from './FilterPanel'
import PolicyCard from './PolicyCard'
import StatsBar from './StatsBar'
import Pagination from '@/components/Pagination'
import Spinner from '@/components/Spinner'

const DEFAULT_FILTERS: PolicyFilters = {
  sort_by: 'jurisdiction',
  sort_dir: 'asc',
  page: 1,
  page_size: 12,
}

export default function Browse() {
  const [searchParams] = useSearchParams()
  const jurisdictionParam = searchParams.get('jurisdiction') ?? undefined

  const [filters, setFilters] = useState<PolicyFilters>({
    ...DEFAULT_FILTERS,
    jurisdiction: jurisdictionParam,
  })

  // Sync if URL param changes (e.g. navigating from map)
  useEffect(() => {
    if (jurisdictionParam) {
      setFilters(prev => ({ ...prev, jurisdiction: jurisdictionParam, page: 1 }))
    }
  }, [jurisdictionParam])

  const policiesQuery = useQuery({
    queryKey: ['policies', filters],
    queryFn: () => fetchPolicies(filters),
    placeholderData: prev => prev,
  })

  const statsQuery = useQuery({
    queryKey: ['policyStats'],
    queryFn: fetchPolicyStats,
    staleTime: 5 * 60_000,
  })

  function updateFilters(patch: Partial<PolicyFilters>) {
    setFilters(prev => ({ ...prev, ...patch }))
  }

  const data = policiesQuery.data
  const isLoading = policiesQuery.isLoading
  const isError = policiesQuery.isError

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Browse EV Policies</h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore policies and incentives across Indian states and global markets
        </p>
      </div>

      {/* Stats bar */}
      {statsQuery.data && (
        <div className="mb-6">
          <StatsBar stats={statsQuery.data} />
        </div>
      )}

      <div className="flex gap-6 items-start">
        {/* Sidebar filter */}
        <aside className="w-56 shrink-0 sticky top-20">
          <FilterPanel filters={filters} onChange={updateFilters} />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Result count + loading indicator */}
          <div className="flex items-center justify-between mb-4 h-6">
            {data && !isLoading && (
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-700">{data.total}</span> policies found
              </p>
            )}
            {policiesQuery.isFetching && <Spinner size="sm" />}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : isError ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <p className="text-red-700 font-medium">Failed to load policies</p>
              <p className="text-red-500 text-sm mt-1">Make sure the backend is running on port 8000</p>
              <button
                onClick={() => policiesQuery.refetch()}
                className="mt-3 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          ) : data && data.items.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <p className="text-slate-500 font-medium">No policies match your filters</p>
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="mt-3 text-sm text-teal-600 hover:text-teal-800"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {data?.items.map(policy => (
                  <PolicyCard key={policy.id} policy={policy} />
                ))}
              </div>

              {data && data.pages > 1 && (
                <div className="mt-6">
                  <Pagination
                    page={data.page}
                    pages={data.pages}
                    total={data.total}
                    pageSize={data.page_size}
                    onChange={p => updateFilters({ page: p })}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
