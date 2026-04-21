import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData'
import createLogger from '@/utils/logger'
import { loadDicomFiles, createVTKImageData, is3DVolume } from './DicomLoader'
import { loadMHDFromFiles, isMHDFile } from './MHDLoader'

const log = createLogger('VolumeLoader')

export type VolumeFormat = 'dicom' | 'mhd' | 'nifti' | 'unknown'

export interface VolumeLoadResult {
  imageData: vtkImageData
  format: VolumeFormat
  metadata: Record<string, unknown>
  scalarRange: [number, number]
  dimensions: [number, number, number]
  spacing: [number, number, number]
}

export interface LoadProgress {
  stage: 'parsing' | 'processing' | 'creating_volume'
  progress: number
  message: string
}

export class VolumeLoader {
  private onProgress?: (progress: LoadProgress) => void

  constructor(onProgress?: (progress: LoadProgress) => void) {
    this.onProgress = onProgress
  }

  private reportProgress(stage: LoadProgress['stage'], progress: number, message: string): void {
    this.onProgress?.({ stage, progress, message })
  }

  async loadFromFiles(files: FileList | File[]): Promise<VolumeLoadResult> {
    const fileArray = Array.from(files)

    if (fileArray.length === 0) {
      throw new Error('No files provided')
    }

    const format = this.detectFormat(fileArray)
    log.info('Detected format', { format, fileCount: fileArray.length })

    switch (format) {
      case 'dicom':
        return this.loadDicom(fileArray)
      case 'mhd':
        return this.loadMHD(fileArray)
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  private detectFormat(files: File[]): VolumeFormat {
    const extensions = files.map(f => {
      const name = f.name.toLowerCase()
      const dotIndex = name.lastIndexOf('.')
      return dotIndex !== -1 ? name.substring(dotIndex) : ''
    })

    if (extensions.some(ext => ext === '.mhd' || ext === '.mha')) {
      return 'mhd'
    }

    if (extensions.some(ext => ext === '.dcm' || ext === '.dicom')) {
      return 'dicom'
    }

    if (extensions.some(ext => ext === '.nii' || ext === '.nii.gz')) {
      return 'nifti'
    }

    const hasMHD = files.some(f => isMHDFile(f))
    if (hasMHD) {
      return 'mhd'
    }

    return 'dicom'
  }

  private async loadDicom(files: File[]): Promise<VolumeLoadResult> {
    this.reportProgress('parsing', 0, '正在解析DICOM文件...')

    const dicomImages = await loadDicomFiles(files)
    
    if (dicomImages.length === 0) {
      throw new Error('No valid DICOM images found')
    }

    this.reportProgress('processing', 50, `已解析 ${dicomImages.length} 张切片`)

    const imageData = createVTKImageData(dicomImages)
    const is3D = is3DVolume(dicomImages)

    this.reportProgress('creating_volume', 80, '正在创建3D体数据...')

    const scalars = imageData.getPointData().getScalars()
    const scalarRange = scalars.getRange() as [number, number]
    const dimensions = imageData.getDimensions() as [number, number, number]
    const spacing = imageData.getSpacing() as [number, number, number]

    this.reportProgress('creating_volume', 100, '加载完成')

    return {
      imageData,
      format: 'dicom',
      metadata: {
        is3D,
        sliceCount: dicomImages.length,
        firstImage: dicomImages[0]?.metadata,
      },
      scalarRange,
      dimensions,
      spacing,
    }
  }

  private async loadMHD(files: File[]): Promise<VolumeLoadResult> {
    this.reportProgress('parsing', 0, '正在解析MHD文件...')

    const mhdVolume = await loadMHDFromFiles(files)

    this.reportProgress('creating_volume', 80, '正在创建3D体数据...')

    const dimensions = mhdVolume.imageData.getDimensions() as [number, number, number]
    const spacing = mhdVolume.imageData.getSpacing() as [number, number, number]

    this.reportProgress('creating_volume', 100, '加载完成')

    return {
      imageData: mhdVolume.imageData,
      format: 'mhd',
      metadata: {
        mhdMetadata: mhdVolume.metadata,
      },
      scalarRange: mhdVolume.scalarRange,
      dimensions,
      spacing,
    }
  }
}

export async function loadVolumeFiles(
  files: FileList | File[],
  onProgress?: (progress: LoadProgress) => void
): Promise<VolumeLoadResult> {
  const loader = new VolumeLoader(onProgress)
  return loader.loadFromFiles(files)
}

export function getSupportedFormats(): { extension: string; description: string }[] {
  return [
    { extension: '.dcm', description: 'DICOM文件' },
    { extension: '.mhd', description: 'MetaImage头文件' },
    { extension: '.mha', description: 'MetaImage头文件 (含数据)' },
    { extension: '.raw', description: '原始数据文件' },
    { extension: '.zraw', description: '压缩原始数据文件' },
  ]
}
