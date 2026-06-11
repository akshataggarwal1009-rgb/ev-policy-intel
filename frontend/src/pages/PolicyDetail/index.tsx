import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchPolicy } from '@/api/policies'
import StatusBadge from '@/components/StatusBadge'
import JurisdictionTypeBadge from '@/components/JurisdictionTypeBadge'
import Spinner from '@/components/Spinner'
import IncentiveCard from './IncentiveCard'

export default function PolicyDetail() {
  const { id } = useParams<{ id: string }>()

  const query = useQuery({
    queryKey: ['policy', id],
    queryFn: () => fetchPolicy(id!),
    enabled: !!id,
  })

  if (query.isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-slate-700 font-medium">Policy not found</p>
        <Link to="/browse" className="mt-3 inline-block text-sm text-teal-600 hover:text-teal-800">
          ← Back to Browse
        </Link>
      </div>
    )
  }

  const p = query.data

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Link to="/browse" className="hover:text-teal-600">Browse</Link>
        <span>›</span>
        <span className="text-slate-600 truncate max-w-xs">{p.jurisdiction}</span>
      </nav>

      {/* Policy header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <JurisdictionTypeBadge type={p.jurisdiction_type} />
            <StatusBadge status={p.status} />
            <span className="text-xs text-slate-400">Confidence: {Math.round(p.confidence * 100)}%</span>
          </div>
          {p.source_url && (
            <a
              href={p.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs text-teal-600 hover:text-teal-800 flex items-center gap-1"
            >
              Official Source
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>

        <p className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2">
          {p.jurisdiction}
        </p>
        <h1 className="text-xl font-bold text-slate-900 mb-4 leading-snug">{p.title}</h1>

        <p className="text-sm text-slate-600 leading-relaxed">{p.summary}</p>

        {/* Dates */}
        <div className="flex gap-6 mt-4 pt-4 border-t border-slate-100">
          {p.effective_date && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Effective</p>
              <p className="text-sm font-medium text-slate-700">
                {new Date(p.effective_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
          )}
          {p.expiry_date && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Expires</p>
              <p className="text-sm font-medium text-slate-700">
                {new Date(p.expiry_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
          )}
        </div>

        {/* Tags */}
        {p.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-slate-100">
            {p.tags.map(tag => (
              <span key={tag} className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Incentives */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Incentives
            <span className="ml-2 text-sm font-normal text-slate-400">({p.incentives.length})</span>
          </h2>
        </div>

        {p.incentives.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
            No incentives recorded for this policy.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {p.incentives.map(inc => (
              <IncentiveCard key={inc.id} incentive={inc} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
