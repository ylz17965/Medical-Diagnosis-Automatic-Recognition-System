export interface Nodule {
  id: string
  position: [number, number, number]
  sliceIndex: number
  location: {
    lobe: string
    segment?: string
    distanceToSurface?: number
  }
  diameter: number
  diameterMm: number
  volume: number
  ctValue: number
  ctValueRange: [number, number]
  riskLevel: 'low' | 'medium' | 'high'
  riskScore: number
  type: 'solid' | 'subsolid' | 'GGN' | 'calcified'
  margin: 'smooth' | 'lobulated' | 'spiculated' | 'ill-defined'
  growthRate?: number
  comparisonNote?: string
  visible: boolean
  selected: boolean
  annotations?: NoduleAnnotation[]
  confirmed: boolean
  createdAt: string
  updatedAt: string
}

export interface NoduleAnnotation {
  id: string
  type: 'point' | 'line' | 'ellipse' | 'polygon'
  data: number[]
  color: string
  visible: boolean
}

export interface Nodule3DMarker {
  id: string
  position: [number, number, number]
  radius: number
  color: string
  opacity: number
  visible: boolean
  selected: boolean
  mesh?: any
}

export interface NoduleDetectionSettings {
  minDiameter: number
  maxDiameter: number
  minCtValue: number
  maxCtValue: number
  sensitivity: number
  autoDetect: boolean
}

export interface NoduleListItem {
  id: string
  lobe: string
  diameter: string
  riskLevel: 'low' | 'medium' | 'high'
  riskScore: number
  visible: boolean
  selected: boolean
}

export const RISK_LEVEL_CONFIG = {
  low: {
    color: '#4CAF50',
    label: '低风险',
    borderColor: '#388E3C'
  },
  medium: {
    color: '#FF9800',
    label: '中风险',
    borderColor: '#F57C00'
  },
  high: {
    color: '#F44336',
    label: '高风险',
    borderColor: '#D32F2F'
  }
}

export const NODULE_TYPE_CONFIG = {
  solid: { label: '实性结节', color: '#FFFFFF' },
  subsolid: { label: '亚实性结节', color: '#90CAF9' },
  GGN: { label: '磨玻璃结节', color: '#CE93D8' },
  calcified: { label: '钙化结节', color: '#FFD54F' }
}

export const MARGIN_TYPE_CONFIG = {
  smooth: { label: '光滑', risk: 1.0 },
  lobulated: { label: '分叶', risk: 1.5 },
  spiculated: { label: '毛刺', risk: 2.0 },
  'ill-defined': { label: '模糊', risk: 1.2 }
}

export function calculateRiskScore(nodule: Partial<Nodule>): number {
  let score = 0.3

  if (nodule.diameter && nodule.diameter > 8) score += 0.1
  if (nodule.diameter && nodule.diameter > 15) score += 0.2
  if (nodule.diameter && nodule.diameter > 20) score += 0.2

  if (nodule.type === 'solid') score += 0.1
  if (nodule.type === 'subsolid') score += 0.15
  if (nodule.type === 'GGN') score += 0.2

  if (nodule.margin === 'spiculated') score += 0.3
  if (nodule.margin === 'lobulated') score += 0.15
  if (nodule.margin === 'ill-defined') score += 0.1

  if (nodule.growthRate && nodule.growthRate > 0) score += 0.2

  return Math.min(1, Math.max(0, score))
}

export function determineRiskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score < 0.4) return 'low'
  if (score < 0.7) return 'medium'
  return 'high'
}
