import api from './client'

export interface CoverageEntry {
  present: boolean
  best_value: string | null
}

export interface JurisdictionCompareData {
  jurisdiction: string
  jurisdiction_type: string | null
  found: boolean
  total_policies: number
  active_policies: number
  total_incentives: number
  avg_confidence: number
  primary_policy: {
    id: string
    title: string
    status: string
    effective_date: string | null
    source_url: string | null
    summary: string | null
  } | null
  subsidies: {
    '2w': number | null
    '3w': number | null
    '4w': number | null
    commercial: number | null
    bus: number | null
  }
  coverage: {
    purchase_subsidy: CoverageEntry
    tax_exemption: CoverageEntry
    registration_waiver: CoverageEntry
    charging_infra: CoverageEntry
    fleet_incentive: CoverageEntry
    scrappage: CoverageEntry
    rd_grant: CoverageEntry
    manufacturing_incentive: CoverageEntry
  }
  all_policy_ids: string[]
}

export interface CompareResponse {
  jurisdictions: JurisdictionCompareData[]
  count: number
}

export async function fetchComparison(jurisdictions: string[]): Promise<CompareResponse> {
  const { data } = await api.get<CompareResponse>('/compare', {
    params: { jurisdictions: jurisdictions.join(',') },
  })
  return data
}
