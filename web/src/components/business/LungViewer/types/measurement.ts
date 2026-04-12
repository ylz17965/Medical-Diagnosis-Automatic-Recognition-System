export interface Measurement {
  id: string
  type: 'distance' | 'angle' | 'area' | 'ctvalue' | 'volume'
  points: MeasurementPoint[]
  value: number
  unit: string
  label?: string
  visible: boolean
  color: string
  lineWidth: number
  createdAt: string
}

export interface MeasurementPoint {
  position: [number, number, number]
  sliceIndex: number
  imageCoords: [number, number]
  worldCoords: [number, number, number]
}

export interface MeasurementLine {
  id: string
  start: MeasurementPoint
  end: MeasurementPoint
  distance: number
}

export interface MeasurementAngle {
  id: string
  vertex: MeasurementPoint
  start: MeasurementPoint
  end: MeasurementPoint
  angle: number
}

export interface MeasurementResult {
  id: string
  type: Measurement['type']
  value: number
  unit: string
  label: string
  points: MeasurementPoint[]
  displayValue: string
}

export interface MeasurementState {
  measurements: Measurement[]
  activeTool: 'select' | 'distance' | 'angle' | 'ctvalue'
  activeMeasurement: string | null
  showLabels: boolean
  showValues: boolean
  defaultColor: string
}

export const MEASUREMENT_COLORS = {
  distance: '#4CAF50',
  angle: '#2196F3',
  area: '#FF9800',
  ctvalue: '#9C27B0',
  volume: '#00BCD4'
}

export function formatMeasurementValue(value: number, type: Measurement['type']): string {
  switch (type) {
    case 'distance':
      return `${value.toFixed(2)} mm`
    case 'angle':
      return `${value.toFixed(1)}°`
    case 'area':
      return `${value.toFixed(2)} mm²`
    case 'ctvalue':
      return `${value.toFixed(0)} HU`
    case 'volume':
      return `${value.toFixed(2)} mm³`
    default:
      return value.toFixed(2)
  }
}

export function calculateDistance(p1: [number, number, number], p2: [number, number, number]): number {
  const dx = p2[0] - p1[0]
  const dy = p2[1] - p1[1]
  const dz = p2[2] - p1[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function calculateAngle(
  p1: [number, number, number],
  vertex: [number, number, number],
  p2: [number, number, number]
): number {
  const v1: [number, number, number] = [p1[0] - vertex[0], p1[1] - vertex[1], p1[2] - vertex[2]]
  const v2: [number, number, number] = [p2[0] - vertex[0], p2[1] - vertex[1], p2[2] - vertex[2]]

  const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]
  const mag1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2])
  const mag2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1] + v2[2] * v2[2])

  const cosAngle = dot / (mag1 * mag2)
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI)
}
