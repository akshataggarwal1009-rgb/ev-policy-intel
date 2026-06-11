import api from './client'
import type {
  PaginatedResponse,
  PolicySummary,
  PolicyDetail,
  PolicyStats,
  PolicyFilters,
} from '@/types'

export async function fetchPolicies(filters: PolicyFilters): Promise<PaginatedResponse<PolicySummary>> {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
  )
  const { data } = await api.get<PaginatedResponse<PolicySummary>>('/policies', { params })
  return data
}

export async function fetchPolicy(id: string): Promise<PolicyDetail> {
  const { data } = await api.get<PolicyDetail>(`/policies/${id}`)
  return data
}

export async function fetchPolicyStats(): Promise<PolicyStats> {
  const { data } = await api.get<PolicyStats>('/policies/stats')
  return data
}

export async function fetchJurisdictions(type?: string): Promise<string[]> {
  const params = type ? { jurisdiction_type: type } : {}
  const { data } = await api.get<string[]>('/policies/jurisdictions', { params })
  return data
}
