import type { StateMapData, MapMetric } from '@/types/map'

/**
 * Normalises GeoJSON property names (from deldersveld India topojson NAME_1)
 * to the jurisdiction strings used in the database.
 */
export const GEO_TO_DB: Record<string, string> = {
  'Andaman & Nicobar Island': 'Andaman and Nicobar',
  'Andaman and Nicobar': 'Andaman and Nicobar',
  'Andhra Pradesh': 'Andhra Pradesh',
  'Arunachal Pradesh': 'Arunachal Pradesh',
  'Assam': 'Assam',
  'Bihar': 'Bihar',
  'Chandigarh': 'Chandigarh',
  'Chhattisgarh': 'Chhattisgarh',
  'Dadra and Nagar Haveli': 'Dadra and Nagar Haveli',
  'Daman and Diu': 'Daman and Diu',
  'Delhi': 'Delhi',
  'NCT of Delhi': 'Delhi',
  'Goa': 'Goa',
  'Gujarat': 'Gujarat',
  'Haryana': 'Haryana',
  'Himachal Pradesh': 'Himachal Pradesh',
  'Jammu & Kashmir': 'Jammu and Kashmir',
  'Jammu and Kashmir': 'Jammu and Kashmir',
  'Jharkhand': 'Jharkhand',
  'Karnataka': 'Karnataka',
  'Kerala': 'Kerala',
  'Lakshadweep': 'Lakshadweep',
  'Madhya Pradesh': 'Madhya Pradesh',
  'Maharashtra': 'Maharashtra',
  'Manipur': 'Manipur',
  'Meghalaya': 'Meghalaya',
  'Mizoram': 'Mizoram',
  'Nagaland': 'Nagaland',
  'Odisha': 'Odisha',
  'Orissa': 'Odisha',
  'Puducherry': 'Puducherry',
  'Pondicherry': 'Puducherry',
  'Punjab': 'Punjab',
  'Rajasthan': 'Rajasthan',
  'Sikkim': 'Sikkim',
  'Tamil Nadu': 'Tamil Nadu',
  'Telangana': 'Telangana',
  'Tripura': 'Tripura',
  'Uttar Pradesh': 'Uttar Pradesh',
  'Uttarakhand': 'Uttarakhand',
  'Uttaranchal': 'Uttarakhand',
  'West Bengal': 'West Bengal',
}

// Teal color ramp — 6 discrete buckets
const COLOR_RAMP = [
  '#f0fdfa', // teal-50  — 0
  '#99f6e4', // teal-200 — 1
  '#2dd4bf', // teal-400 — 2-3
  '#14b8a6', // teal-500 — 4-5
  '#0d9488', // teal-600 — 6-8
  '#0f766e', // teal-700 — 9+
]
const NO_DATA_COLOR = '#e2e8f0' // slate-200

export function getStateColor(
  stateData: StateMapData | undefined,
  metric: MapMetric,
  maxValue: number,
): string {
  if (!stateData) return NO_DATA_COLOR
  const raw = getMetricValue(stateData, metric)
  if (raw === null || raw === 0) return NO_DATA_COLOR

  const buckets = COLOR_RAMP.length - 1
  const ratio = maxValue > 0 ? Math.min(raw / maxValue, 1) : 0
  const idx = Math.max(1, Math.ceil(ratio * buckets))
  return COLOR_RAMP[idx] ?? COLOR_RAMP[COLOR_RAMP.length - 1]
}

export function getMetricValue(state: StateMapData, metric: MapMetric): number | null {
  if (metric === 'incentive_count') return state.incentive_count
  if (metric === 'policy_count') return state.policy_count
  if (metric === 'max_subsidy_inr') return state.max_subsidy_inr
  return null
}

export function formatMetricValue(value: number | null, metric: MapMetric): string {
  if (value === null) return '—'
  if (metric === 'max_subsidy_inr') {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`
    return `₹${value}`
  }
  return String(value)
}

export function getLegendStops(maxValue: number, metric: MapMetric): { color: string; label: string }[] {
  return [
    { color: NO_DATA_COLOR, label: 'No data' },
    ...COLOR_RAMP.slice(1).map((color, i) => {
      const lo = Math.round((i / (COLOR_RAMP.length - 1)) * maxValue)
      const hi = Math.round(((i + 1) / (COLOR_RAMP.length - 1)) * maxValue)
      const loStr = formatMetricValue(lo, metric)
      const hiStr = formatMetricValue(hi, metric)
      return { color, label: i === COLOR_RAMP.length - 2 ? `${loStr}+` : `${loStr}–${hiStr}` }
    }),
  ]
}

export const INDIA_PROJECTION_CONFIG = {
  scale: 1050,
  center: [82, 22] as [number, number],
}
