import { useState, memo } from 'react'
import { MouseEvent } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  type Geography as GeoType,
} from 'react-simple-maps'
import type { StateMapData, MapMetric } from '@/types/map'
import { GEO_TO_DB, getStateColor, formatMetricValue, INDIA_PROJECTION_CONFIG } from './mapUtils'

// Publicly available India states topojson via jsDelivr CDN
const GEO_URL =
  'https://cdn.jsdelivr.net/gh/deldersveld/topojson@master/countries/india/india-states.json'

interface Tooltip {
  x: number
  y: number
  jurisdiction: string
  value: string
}

interface Props {
  stateIndex: Map<string, StateMapData>
  metric: MapMetric
  maxValue: number
  selectedJurisdiction: string | null
  onStateClick: (jurisdiction: string) => void
}

function IndiaMap({ stateIndex, metric, maxValue, selectedJurisdiction, onStateClick }: Props) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [82, 22],
    zoom: 1,
  })

  function resolveJurisdiction(geo: { properties: Record<string, string> }): string | null {
    // deldersveld India topojson uses NAME_1 for state names
    const raw = geo.properties.NAME_1 ?? geo.properties.name ?? geo.properties.NAME ?? ''
    return GEO_TO_DB[raw] ?? raw ?? null
  }

  return (
    <div className="relative w-full h-full select-none" onMouseLeave={() => setTooltip(null)}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={INDIA_PROJECTION_CONFIG}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={({ zoom, coordinates }: { zoom: number; coordinates: [number, number] }) =>
            setPosition({ zoom, coordinates })
          }
          minZoom={0.9}
          maxZoom={6}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: GeoType[] }) =>
              geographies.map((geo: GeoType) => {
                const jurisdiction = resolveJurisdiction(geo)
                if (!jurisdiction) return null

                const data = jurisdiction ? stateIndex.get(jurisdiction) : undefined
                const fill = getStateColor(data, metric, maxValue)
                const isSelected = selectedJurisdiction === jurisdiction
                const metricVal = data ? formatMetricValue(
                  metric === 'incentive_count' ? data.incentive_count
                  : metric === 'policy_count' ? data.policy_count
                  : data.max_subsidy_inr,
                  metric
                ) : '—'

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke={isSelected ? '#0d9488' : '#fff'}
                    strokeWidth={isSelected ? 1.5 / position.zoom : 0.5 / position.zoom}
                    style={{
                      default: { outline: 'none', cursor: 'pointer', filter: isSelected ? 'brightness(0.85)' : 'none' },
                      hover: { outline: 'none', filter: 'brightness(0.9)', cursor: 'pointer' },
                      pressed: { outline: 'none' },
                    }}
                    onClick={() => jurisdiction && onStateClick(jurisdiction)}
                    onMouseEnter={(e: MouseEvent<SVGPathElement>) => {
                      const rect = (e.currentTarget as SVGElement)
                        .closest('svg')!
                        .getBoundingClientRect()
                      setTooltip({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top - 10,
                        jurisdiction: jurisdiction ?? '',
                        value: metricVal,
                      })
                    }}
                    onMouseMove={(e: MouseEvent<SVGPathElement>) => {
                      const rect = (e.currentTarget as SVGElement)
                        .closest('svg')!
                        .getBoundingClientRect()
                      setTooltip(prev =>
                        prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top - 10 } : prev
                      )
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="font-semibold">{tooltip.jurisdiction}</p>
          <p className="text-slate-300">{tooltip.value}</p>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        {[
          { label: '+', delta: 0.5 },
          { label: '−', delta: -0.5 },
        ].map(btn => (
          <button
            key={btn.label}
            onClick={() =>
              setPosition(p => ({
                ...p,
                zoom: Math.min(6, Math.max(0.9, p.zoom + btn.delta)),
              }))
            }
            className="w-8 h-8 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-bold shadow-sm flex items-center justify-center"
          >
            {btn.label}
          </button>
        ))}
        <button
          onClick={() => setPosition({ coordinates: [82, 22], zoom: 1 })}
          className="w-8 h-8 bg-white border border-slate-200 rounded-lg text-slate-400 hover:bg-slate-50 shadow-sm flex items-center justify-center text-xs"
          title="Reset zoom"
        >
          ⊙
        </button>
      </div>
    </div>
  )
}

export default memo(IndiaMap)
