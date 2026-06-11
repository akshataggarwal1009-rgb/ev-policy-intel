import api from './client'
import type { MapApiResponse } from '@/types/map'

export async function fetchMapData(): Promise<MapApiResponse> {
  const { data } = await api.get<MapApiResponse>('/map/data')
  return data
}
