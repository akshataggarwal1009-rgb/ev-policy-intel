import { useState } from 'react'
import clsx from 'clsx'
import { getAdminToken, setAdminToken, clearAdminToken } from '@/api/admin'
import SystemStatus from './SystemStatus'
import UsagePanel from './UsagePanel'
import IngestionPanel from './IngestionPanel'

type Tab = 'system' | 'usage' | 'ingestion'

const TABS: { id: Tab; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'usage', label: 'Analytics' },
  { id: 'ingestion', label: 'Ingestion' },
]

function TokenGate({ onAuth }: { onAuth: () => void }) {
  const [token, setToken] = useState('')
  const [error, setError] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!token.trim()) return
    setAdminToken(token.trim())
    setError(false)
    onAuth()
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <span className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-sm">A</span>
          <span className="font-semibold text-slate-900">Admin access</span>
        </div>
        <p className="text-sm text-slate-500 mb-5">Enter your admin token to continue.</p>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Admin token"
            autoFocus
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          {error && <div className="text-red-500 text-xs">Invalid token.</div>}
          <button
            type="submit"
            className="w-full py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors text-sm"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Admin() {
  const [authed, setAuthed] = useState(() => !!getAdminToken())
  const [tab, setTab] = useState<Tab>('system')

  function handleAuth() {
    setAuthed(true)
  }

  function handleLogout() {
    clearAdminToken()
    setAuthed(false)
  }

  if (!authed) {
    return <TokenGate onAuth={handleAuth} />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">System status, usage analytics, and ingestion controls</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'px-4 py-2.5 text-sm font-medium rounded-t-md border-b-2 -mb-px transition-colors',
              tab === t.id
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panel */}
      {tab === 'system' && <SystemStatus />}
      {tab === 'usage' && <UsagePanel />}
      {tab === 'ingestion' && <IngestionPanel />}
    </div>
  )
}
