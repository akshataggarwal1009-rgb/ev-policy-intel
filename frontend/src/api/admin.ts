import api from './client'

const TOKEN_KEY = 'ev_admin_token'

export function getAdminToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? ''
}

export function setAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAdminToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

function h() {
  return { 'X-Admin-Token': getAdminToken() }
}

// ── System status ──────────────────────────────────────────────────────────────

export interface AdminStatus {
  embedding_api_available: boolean
  policies: { total: number; embedded: number; missing: number }
  incentives: { total: number; embedded: number; missing: number }
}

export async function fetchAdminStatus(): Promise<AdminStatus> {
  const { data } = await api.get<AdminStatus>('/admin/status', { headers: h() })
  return data
}

export async function triggerEmbed(force = false): Promise<{ policies_embedded: number; incentives_embedded: number; errors: string[] }> {
  const { data } = await api.post('/admin/embed', {}, { headers: h(), params: { force } })
  return data
}

// ── Analytics ──────────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  events_7d: number
  events_30d: number
  chat_7d: number
  chat_30d: number
  unique_sessions_7d: number
  unique_sessions_30d: number
  total_prompt_tokens: number
  total_completion_tokens: number
  avg_chat_latency_ms: number | null
  event_breakdown_30d: Record<string, number>
  top_queries_30d: { query: string; count: number }[]
  top_jurisdictions_30d: { jurisdiction: string; count: number }[]
  daily_events_30d: { date: string; count: number }[]
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  const { data } = await api.get<AnalyticsSummary>('/admin/analytics/summary', { headers: h() })
  return data
}

// ── Ingestion ──────────────────────────────────────────────────────────────────

export interface IngestionRun {
  id: string
  source_name: string
  source_url: string | null
  status: string
  policies_found: number
  policies_updated: number
  error_message: string | null
  started_at: string | null
  finished_at: string | null
  duration_s: number | null
}

export interface IngestionSource {
  name: string
  url: string
  jurisdiction: string
  jurisdiction_type: string
  tags: string[]
  check_interval_hours: number
  last_checked: string | null
  content_hash: string | null
}

export async function fetchIngestionRuns(limit = 100): Promise<{ total: number; runs: IngestionRun[] }> {
  const { data } = await api.get('/admin/ingestion/runs', { headers: h(), params: { limit } })
  return data
}

export async function fetchIngestionSources(): Promise<{ count: number; sources: IngestionSource[] }> {
  const { data } = await api.get('/admin/ingestion/sources', { headers: h() })
  return data
}

export async function triggerSource(sourceName: string): Promise<{ status: string; source: string }> {
  const { data } = await api.post(
    `/admin/ingestion/trigger/${encodeURIComponent(sourceName)}`,
    {},
    { headers: h() },
  )
  return data
}

export async function triggerAllSources(): Promise<{ status: string; count: number }> {
  const { data } = await api.post('/admin/ingestion/trigger-all', {}, { headers: h() })
  return data
}
