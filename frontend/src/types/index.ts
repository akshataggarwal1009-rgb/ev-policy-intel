export type JurisdictionType = 'indian_state' | 'indian_ut' | 'national_india' | 'global_market'
export type PolicyStatus = 'active' | 'draft' | 'expired' | 'under_review'
export type IncentiveCategory =
  | 'purchase_subsidy'
  | 'tax_exemption'
  | 'registration_waiver'
  | 'charging_infra'
  | 'fleet_incentive'
  | 'scrappage'
  | 'rd_grant'
  | 'manufacturing_incentive'
  | 'other'
export type VehicleSegment = '2w' | '3w' | '4w' | 'commercial' | 'bus' | 'all'

export interface Incentive {
  id: string
  policy_id: string
  category: IncentiveCategory
  title: string
  description: string
  value_text: string | null
  value_amount: number | null
  value_unit: string | null
  vehicle_segment: VehicleSegment
  beneficiary: string | null
  is_stackable: boolean
  created_at: string
  updated_at: string
  // extended fields on IncentiveWithPolicy
  policy_jurisdiction?: string
  policy_title?: string
  policy_status?: string
}

export interface PolicySummary {
  id: string
  jurisdiction: string
  jurisdiction_type: JurisdictionType
  title: string
  summary: string
  status: PolicyStatus
  confidence: number
  source_url: string | null
  effective_date: string | null
  expiry_date: string | null
  tags: string[]
  incentive_count: number
  created_at: string
  updated_at: string
}

export interface PolicyDetail extends PolicySummary {
  raw_text: string | null
  incentives: Incentive[]
}

export interface JurisdictionStats {
  jurisdiction: string
  jurisdiction_type: string
  policy_count: number
  active_count: number
  incentive_count: number
}

export interface PolicyStats {
  total_policies: number
  active_policies: number
  total_incentives: number
  by_jurisdiction_type: Record<string, number>
  by_status: Record<string, number>
  top_jurisdictions: JurisdictionStats[]
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface PolicyFilters {
  jurisdiction?: string
  jurisdiction_type?: JurisdictionType | ''
  status?: PolicyStatus | ''
  tags?: string
  search?: string
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
  page?: number
  page_size?: number
}
