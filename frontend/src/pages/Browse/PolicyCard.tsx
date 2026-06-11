import { Link } from 'react-router-dom'
import type { PolicySummary } from '@/types'
import StatusBadge from '@/components/StatusBadge'
import JurisdictionTypeBadge from '@/components/JurisdictionTypeBadge'

interface Props {
  policy: PolicySummary
}

export default function PolicyCard({ policy }: Props) {
  return (
    <Link
      to={`/policy/${policy.id}`}
      className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-teal-300 hover:shadow-md transition-all duration-150 flex flex-col gap-3"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <JurisdictionTypeBadge type={policy.jurisdiction_type} />
          <StatusBadge status={policy.status} />
        </div>
        <ConfidenceDot confidence={policy.confidence} />
      </div>

      {/* Jurisdiction + Title */}
      <div>
        <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-1">
          {policy.jurisdiction}
        </p>
        <h3 className="text-sm font-semibold text-slate-900 leading-snug group-hover:text-teal-700 line-clamp-2">
          {policy.title}
        </h3>
      </div>

      {/* Summary */}
      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
        {policy.summary}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 mt-auto">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {policy.effective_date && (
            <span>Effective {new Date(policy.effective_date).getFullYear()}</span>
          )}
          {policy.expiry_date && (
            <span>Expires {new Date(policy.expiry_date).getFullYear()}</span>
          )}
        </div>
        <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
          {policy.incentive_count} incentive{policy.incentive_count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tags */}
      {policy.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
          {policy.tags.slice(0, 4).map(tag => (
            <span key={tag} className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
              {tag}
            </span>
          ))}
          {policy.tags.length > 4 && (
            <span className="text-xs px-1.5 py-0.5 text-slate-400">+{policy.tags.length - 4}</span>
          )}
        </div>
      )}
    </Link>
  )
}

function ConfidenceDot({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const color = pct >= 95 ? 'bg-green-500' : pct >= 85 ? 'bg-yellow-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-1.5 shrink-0" title={`Data confidence: ${pct}%`}>
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-slate-400">{pct}%</span>
    </div>
  )
}
