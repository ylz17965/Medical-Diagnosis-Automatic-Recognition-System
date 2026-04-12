export interface DicomMetadata {
  patientName?: string
  patientId?: string
  studyDate?: string
  seriesDate?: string
  seriesInstanceUid?: string
  sopInstanceUid?: string
  modality: 'CT' | 'MR' | 'DX' | 'CR' | 'XA' | 'MG' | 'PT'
  seriesDescription?: string
  rows: number
  columns: number
  sliceThickness: number
  pixelSpacing: [number, number]
  windowCenter: number
  windowWidth: number
  bitsAllocated: number
  bitsStored: number
  rescaleIntercept: number
  rescaleSlope: number
  numberOfFrames?: number
  imagePositionPatient?: [number, number, number]
  imageOrientationPatient?: [number, number, number, number, number, number]
}

export interface DicomPixelData {
  pixelData: Int16Array | Uint8Array | Uint16Array | Int8Array
  rows: number
  columns: number
  frames: number
}

export interface DicomFile {
  file: File
  metadata: DicomMetadata
  pixelData: DicomPixelData
}

export interface DicomSeries {
  seriesInstanceUid: string
  seriesDescription: string
  modality: string
  seriesNumber: number
  instances: DicomFile[]
  numberOfSlices: number
}

export interface DicomStudy {
  studyInstanceUid: string
  patientId: string
  patientName: string
  studyDate: string
  studies: DicomSeries[]
}

export interface LoadProgress {
  loaded: number
  total: number
  currentFile: string
  percentage: number
}

export interface DicomLoaderOptions {
  onProgress?: (progress: LoadProgress) => void
  onError?: (error: Error) => void
  parallel?: number
}

export type WindowLevelPreset = {
  name: string
  windowWidth: number
  windowCenter: number
  description: string
}

export const WINDOW_LEVEL_PRESETS: WindowLevelPreset[] = [
  { name: '肺窗', windowWidth: 1500, windowCenter: -600, description: '肺部软组织' },
  { name: '纵隔窗', windowWidth: 400, windowCenter: 40, description: '纵隔和血管' },
  { name: '骨窗', windowWidth: 2500, windowCenter: 480, description: '骨骼结构' },
  { name: '软组织窗', windowWidth: 350, windowCenter: 40, description: '软组织' },
  { name: '肝脏窗', windowWidth: 150, windowCenter: 30, description: '肝脏' },
  { name: '脑窗', windowWidth: 80, windowCenter: 40, description: '脑组织' },
]
