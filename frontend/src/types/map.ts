export interface StateMapData {
  jurisdiction: string
  jurisdiction_type: string
  policy_count: number
  active_count: number
  incentive_count: number
  max_subsidy_inr: number | null
  has_purchase_subsidy: boolean
  has_road_tax_waiver: boolean
  has_charging_infra: boolean
  has_manufacturing: boolean
}

export interface MapApiResponse {
  states: StateMapData[]
  meta: {
    total_jurisdictions: number
    max_incentive_count: number
    max_policy_count: number
  }
}

export type MapMetric = 'incentive_count' | 'policy_count' | 'max_subsidy_inr'
