export interface Point3D {
  x: number
  y: number
  z: number
  index: number
}

export interface LungBounds {
  min: Point3D
  max: Point3D
  center: Point3D
}

export interface SegmentedLungs {
  leftLungMask: Uint8Array
  rightLungMask: Uint8Array
  fullLungMask: Uint8Array
  leftLungBounds: LungBounds
  rightLungBounds: LungBounds
  fullLungBounds: LungBounds
}

export interface LungLobeSegmentation {
  leftUpperLobeMask: Uint8Array
  leftLowerLobeMask: Uint8Array
  rightUpperLobeMask: Uint8Array
  rightMiddleLobeMask: Uint8Array
  rightLowerLobeMask: Uint8Array
}

export interface AirwayNode {
  point: Point3D
  radius: number
  generation: number
  children: AirwayNode[]
  parent: AirwayNode | null
}

export interface AirwayTree {
  root: AirwayNode
  totalNodes: number
  maxGeneration: number
  nodesByGeneration: Map<number, AirwayNode[]>
}

export interface MeshData {
  positions: Float32Array
  normals: Float32Array
  indices: Uint16Array
  bounds: LungBounds
}

export interface MarchingCubesResult {
  vertices: Float32Array
  normals: Float32Array
  indices: Uint16Array
  vertexCount: number
  triangleCount: number
}

export interface SegmentationConfig {
  lungMinThreshold: number
  lungMaxThreshold: number
  airwayThreshold: number
  fissureThreshold: number
  minLungVolume: number
  maxAirwayGeneration: number
}

export const DEFAULT_SEGMENTATION_CONFIG: SegmentationConfig = {
  lungMinThreshold: -1000,
  lungMaxThreshold: -300,
  airwayThreshold: -900,
  fissureThreshold: -100,
  minLungVolume: 1000,
  maxAirwayGeneration: 8
}

export interface WindowLevelPreset {
  name: string
  windowCenter: number
  windowWidth: number
  description?: string
}

export const WINDOW_PRESETS: WindowLevelPreset[] = [
  { name: '肺窗', windowCenter: -600, windowWidth: 1500, description: '肺实质' },
  { name: '纵隔窗', windowCenter: 40, windowWidth: 400, description: '软组织' },
  { name: '骨窗', windowCenter: 500, windowWidth: 2000, description: '骨骼' },
  { name: '软组织', windowCenter: 40, windowWidth: 350, description: '软组织窗' }
]
