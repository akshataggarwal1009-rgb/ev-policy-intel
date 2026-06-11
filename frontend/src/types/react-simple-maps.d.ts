declare module 'react-simple-maps' {
  import { ReactNode, MouseEvent, CSSProperties } from 'react'

  interface ProjectionConfig {
    scale?: number
    center?: [number, number]
    rotate?: [number, number, number]
  }

  interface ComposableMapProps {
    projection?: string
    projectionConfig?: ProjectionConfig
    style?: CSSProperties
    children?: ReactNode
  }

  interface ZoomableGroupProps {
    zoom?: number
    center?: [number, number]
    minZoom?: number
    maxZoom?: number
    onMoveEnd?: (position: { zoom: number; coordinates: [number, number] }) => void
    children?: ReactNode
  }

  interface GeographiesProps {
    geography: string | object
    children: (props: { geographies: Geography[] }) => ReactNode
  }

  interface Geography {
    rsmKey: string
    properties: Record<string, string>
    [key: string]: unknown
  }

  interface GeographyProps {
    key?: string
    geography: Geography
    fill?: string
    stroke?: string
    strokeWidth?: number
    style?: {
      default?: CSSProperties & { outline?: string; filter?: string; cursor?: string }
      hover?: CSSProperties & { outline?: string; filter?: string; cursor?: string }
      pressed?: CSSProperties & { outline?: string }
    }
    onClick?: (evt: MouseEvent<SVGPathElement>) => void
    onMouseEnter?: (evt: MouseEvent<SVGPathElement>) => void
    onMouseMove?: (evt: MouseEvent<SVGPathElement>) => void
    onMouseLeave?: (evt: MouseEvent<SVGPathElement>) => void
  }

  export function ComposableMap(props: ComposableMapProps): JSX.Element
  export function ZoomableGroup(props: ZoomableGroupProps): JSX.Element
  export function Geographies(props: GeographiesProps): JSX.Element
  export function Geography(props: GeographyProps): JSX.Element
}
