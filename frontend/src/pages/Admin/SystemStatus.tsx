import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchAdminStatus, triggerEmbed } from '@/api/admin'
import Spinner from '@/components/Spinner'
import StatCard from './StatCard'

function CoverageBar({ embedded, total }: { embedded: number; total: number }) {
  const pct = total > 0 ? Math.round((embedded / total) * 100) : 0
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{embedded} / {total} embedded</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-teal-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function SystemStatus() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-status'],
    queryFn: fetchAdminStatus,
  })

  const embed = useMutation({
    mutationFn: (force: boolean) => triggerEmbed(force),
    onSuccess: () => refetch(),
  })

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (error) return <div className="text-red-500 text-sm py-8 text-center">Failed to load status — check your admin token.</div>
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Policies" value={data.policies.total} />
        <StatCard label="Total Incentives" value={data.incentives.total} />
        <StatCard
          label="Policy Embeddings"
          value={`${data.policies.embedded}/${data.policies.total}`}
          sub={data.policies.missing > 0 ? `${data.policies.missing} missing` : 'All embedded'}
          accent={data.policies.missing === 0}
        />
        <StatCard
          label="Incentive Embeddings"
          value={`${data.incentives.embedded}/${data.incentives.total}`}
          sub={data.incentives.missing > 0 ? `${data.incentives.missing} missing` : 'All embedded'}
          accent={data.incentives.missing === 0}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="font-semibold text-slate-800 mb-3">Policy embedding coverage</div>
          <CoverageBar embedded={data.policies.embedded} total={data.policies.total} />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="font-semibold text-slate-800 mb-3">Incentive embedding coverage</div>
          <CoverageBar embedded={data.incentives.embedded} total={data.incentives.total} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="font-semibold text-slate-800 mb-4">Actions</div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => embed.mutate(false)}
            disabled={embed.isPending || !data.embedding_api_available}
            className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {embed.isPending ? 'Running…' : 'Embed missing records'}
          </button>
          <button
            onClick={() => embed.mutate(true)}
            disabled={embed.isPending || !data.embedding_api_available}
            className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Re-embed all (force)
          </button>
          {!data.embedding_api_available && (
            <span className="text-xs text-amber-600 self-center">OPENAI_API_KEY not set — embeddings unavailable</span>
          )}
        </div>
        {embed.data && (
          <div className="mt-3 text-sm text-slate-600">
            Done: {embed.data.policies_embedded} policies, {embed.data.incentives_embedded} incentives embedded.
            {embed.data.errors.length > 0 && (
              <span className="text-red-500 ml-2">{embed.data.errors.length} error(s)</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
