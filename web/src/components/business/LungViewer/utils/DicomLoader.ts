// @ts-nocheck
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import dicomParser from 'dicom-parser';

export interface DicomMetadata {
  patientName: string
  patientId: string
  studyDate: string
  seriesDescription: string
  rows: number
  columns: number
  sliceThickness: number
  windowCenter: number
  windowWidth: number
  rescaleSlope: number
  rescaleIntercept: number
  displayMin?: number
  displayMax?: number
}

export interface DicomImage {
  imageId: string
  metadata: DicomMetadata
  pixelData: Float32Array
  dimensions: [number, number, number]
  spacing: [number, number, number]
}

function getArrayMin(arr: Float32Array): number {
  let min = arr[0]
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < min) min = arr[i]
  }
  return min
}

function getArrayMax(arr: Float32Array): number {
  let max = arr[0]
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > max) max = arr[i]
  }
  return max
}

function getPercentile(arr: Float32Array, percentile: number): number {
  const sorted = Array.from(arr).sort((a, b) => a - b)
  const index = Math.floor(sorted.length * percentile / 100)
  return sorted[Math.min(index, sorted.length - 1)]
}

export async function loadDicomFiles(files: File[]): Promise<DicomImage[]> {
  const sortedFiles = sortDicomFiles(files)
  const images: DicomImage[] = []

  for (const file of sortedFiles) {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const byteArray = new Uint8Array(arrayBuffer)
      const dataSet = dicomParser.parseDicom(byteArray)

      const pixelDataElement = dataSet.elements.x7fe00010
      if (!pixelDataElement) {
        console.warn(`No pixel data found in ${file.name}`)
        continue
      }

      const rows = dataSet.uint16('x00280010')
      const columns = dataSet.uint16('x00280011')
      const bitsAllocated = dataSet.uint16('x00280100')
      const pixelRepresentation = dataSet.uint16('x00280103') || 0
      const photometricInterpretation = dataSet.string('x00280004') || 'MONOCHROME2'

      let rawPixelData: Int16Array | Uint16Array
      const dataOffset = pixelDataElement.dataOffset
      const dataLength = pixelDataElement.length

      if (bitsAllocated === 16) {
        if (pixelRepresentation === 1) {
          rawPixelData = new Int16Array(dataSet.byteArray.buffer, dataOffset, dataLength / 2)
        } else {
          rawPixelData = new Uint16Array(dataSet.byteArray.buffer, dataOffset, dataLength / 2)
        }
      } else if (bitsAllocated === 8) {
        rawPixelData = new Uint8Array(dataSet.byteArray.buffer, dataOffset, dataLength)
      } else {
        rawPixelData = new Uint16Array(dataSet.byteArray.buffer, dataOffset, dataLength / 2)
      }

      const sliceThickness = parseFloat(dataSet.string('x00180050') || '1')
      const pixelSpacingStr = dataSet.string('x00280030')
      const pixelSpacing = pixelSpacingStr ? parseFloat(pixelSpacingStr.split('\\')[0]) : 1
      const rescaleSlope = parseFloat(dataSet.string('x00281053') || '1')
      const rescaleIntercept = parseFloat(dataSet.string('x00281052') || '0')
      
      const windowCenterStr = dataSet.string('x00281050')
      const windowWidthStr = dataSet.string('x00281051')
      const windowCenter = windowCenterStr ? parseFloat(windowCenterStr.split('\\')[0]) : 40
      const windowWidth = windowWidthStr ? parseFloat(windowWidthStr.split('\\')[0]) : 400

      console.log(`DICOM tags for ${file.name}:`, {
        bitsAllocated,
        pixelRepresentation,
        photometricInterpretation,
        rescaleSlope,
        rescaleIntercept,
        pixelSpacing,
        windowCenter,
        windowWidth
      })

      const pixelData = new Float32Array(rawPixelData.length)
      for (let i = 0; i < rawPixelData.length; i++) {
        pixelData[i] = rawPixelData[i] * rescaleSlope + rescaleIntercept
      }

      const p5 = getPercentile(pixelData, 5)
      const p95 = getPercentile(pixelData, 95)
      
      const minHU = getArrayMin(pixelData)
      const maxHU = getArrayMax(pixelData)

      console.log(`Loaded ${file.name}: ${columns}x${rows}, ${rawPixelData.length} pixels`)
      console.log(`  Full range: ${minHU} to ${maxHU}`)
      console.log(`  Display range (5th-95th percentile): ${p5.toFixed(0)} to ${p95.toFixed(0)}`)
      console.log(`  Window: center=${windowCenter}, width=${windowWidth}`)

      images.push({
        imageId: `dicom:${file.name}`,
        metadata: {
          patientName: dataSet.string('x00100010') || 'Unknown',
          patientId: dataSet.string('x00100020') || '',
          studyDate: dataSet.string('x00080020') || '',
          seriesDescription: dataSet.string('x0008103e') || '',
          rows,
          columns,
          sliceThickness,
          windowCenter,
          windowWidth,
          rescaleSlope,
          rescaleIntercept,
          displayMin: p5,
          displayMax: p95
        },
        pixelData,
        dimensions: [columns, rows, 1],
        spacing: [pixelSpacing, pixelSpacing, sliceThickness]
      })
    } catch (error) {
      console.warn(`Failed to parse ${file.name}:`, error)
    }
  }

  return images
}

function sortDicomFiles(files: File[]): File[] {
  const sorted = Array.from(files)

  sorted.sort((a, b) => {
    const instanceNumberA = extractInstanceNumber(a.name)
    const instanceNumberB = extractInstanceNumber(b.name)
    return instanceNumberA - instanceNumberB
  })

  return sorted
}

function extractInstanceNumber(filename: string): number {
  const match = filename.match(/(\d+)/)
  if (match) {
    return parseInt(match[1], 10)
  }
  return 0
}

export function createVTKImageData(dicomImages: DicomImage[]): any {
  if (dicomImages.length === 0) {
    throw new Error('No DICOM images to process')
  }

  const firstImage = dicomImages[0]
  const width = firstImage.metadata.columns
  const height = firstImage.metadata.rows
  const numSlices = dicomImages.length

  const imageData = vtkImageData.newInstance()
  imageData.setDimensions(width, height, numSlices)

  const pixelSpacing = firstImage.spacing[0] || 1
  const sliceThickness = firstImage.spacing[2] || firstImage.metadata.sliceThickness || 1
  imageData.setSpacing(pixelSpacing, pixelSpacing, sliceThickness)

  const scalars = vtkDataArray.newInstance({
    name: 'CT',
    numberOfComponents: 1,
    values: new Float32Array(width * height * numSlices)
  })

  dicomImages.forEach((img, z) => {
    const sliceOffset = z * width * height
    for (let i = 0; i < width * height; i++) {
      scalars.getData()[sliceOffset + i] = img.pixelData[i]
    }
  })

  imageData.getPointData().setScalars(scalars)

  const scalarRange = scalars.getRange()
  console.log('Created VTK ImageData:', {
    dimensions: imageData.getDimensions(),
    spacing: imageData.getSpacing(),
    scalarRange: scalarRange,
    is3D: numSlices > 1
  })

  return imageData
}

export function is3DVolume(dicomImages: DicomImage[]): boolean {
  return dicomImages.length > 1
}
