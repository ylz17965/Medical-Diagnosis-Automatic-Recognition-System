import * as THREE from 'three'

export interface VolumeData {
  data: Int16Array | Uint8Array | Float32Array
  shape: [number, number, number]
  spacing: [number, number, number]
  origin: [number, number, number]
  direction: [number, number, number, number, number, number, number, number, number]
}

export interface VolumeBuffer {
  data: Float32Array
  shape: [number, number, number]
  spacing: [number, number, number]
  origin: [number, number, number]
  direction: [number, number, number, number, number, number, number, number, number]
}

export interface VolumeTexture3D {
  texture: THREE.Data3DTexture
  min: number
  max: number
}

export interface LungLobe {
  id: string
  name: string
  nameEn: string
  color: string
  opacity: number
  visible: boolean
  geometry?: THREE.Mesh
  bounds: {
    min: [number, number, number]
    max: [number, number, number]
  }
  center: [number, number, number]
}

export interface BronchusNode {
  id: string
  name: string
  depth: number
  diameter: number
  length: number
  position: [number, number, number]
  direction: [number, number, number]
  children: BronchusNode[]
  visible: boolean
  expanded: boolean
  color?: string
}

export interface LungModel {
  volumeData: VolumeData
  lobes: LungLobe[]
  bronchi: BronchusNode | null
  vesselTree?: BronchusNode
  heartMesh?: THREE.Mesh
  tracheaMesh?: THREE.Mesh
}

export interface VolumeRenderSettings {
  rayStepSize: number
  opacityCorrection: number
  gradThreshold: number
  isoThreshold: number
  shadeEnabled: boolean
  shadeIntensity: number
  colorMap: string
}

export interface ViewMode {
  type: 'axial' | 'coronal' | 'sagittal' | '3d'
  sliceIndex: number
  flippedX: boolean
  flippedY: boolean
  rotated: number
}

export interface Camera2D {
  position: [number, number]
  zoom: number
  windowCenter: number
  windowWidth: number
}

export const LUNG_LOBE_DEFINITIONS: Omit<LungLobe, 'geometry'>[] = [
  {
    id: 'left_upper',
    name: '左上肺叶',
    nameEn: 'Left Upper Lobe',
    color: '#4CAF50',
    opacity: 0.7,
    visible: true,
    bounds: { min: [-80, 0, -40], max: [-20, 100, 20] },
    center: [-50, 50, -10]
  },
  {
    id: 'left_lower',
    name: '左下肺叶',
    nameEn: 'Left Lower Lobe',
    color: '#8BC34A',
    opacity: 0.7,
    visible: true,
    bounds: { min: [-70, -80, -30], max: [-20, 0, 20] },
    center: [-45, -40, -5]
  },
  {
    id: 'right_upper',
    name: '右上肺叶',
    nameEn: 'Right Upper Lobe',
    color: '#F44336',
    opacity: 0.7,
    visible: true,
    bounds: { min: [20, 0, -40], max: [80, 80, 20] },
    center: [50, 40, -10]
  },
  {
    id: 'right_middle',
    name: '右中肺叶',
    nameEn: 'Right Middle Lobe',
    color: '#FF9800',
    opacity: 0.7,
    visible: true,
    bounds: { min: [20, -10, -25], max: [70, 20, 15] },
    center: [45, 5, -5]
  },
  {
    id: 'right_lower',
    name: '右下肺叶',
    nameEn: 'Right Lower Lobe',
    color: '#FF5722',
    opacity: 0.7,
    visible: true,
    bounds: { min: [20, -80, -30], max: [70, -10, 20] },
    center: [45, -45, -5]
  }
]

export const BRONCHUS_COLORS_BY_DEPTH: string[] = [
  '#E0E0E0',
  '#BDBDBD',
  '#9E9E9E',
  '#757575',
  '#616161'
]
