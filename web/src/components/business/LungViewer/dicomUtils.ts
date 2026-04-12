import * as dicomParser from 'dicom-parser'

export function parseDicomFile(file: File): Promise<DicomData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer
        const byteArray = new Uint8Array(arrayBuffer)
        const dataSet = dicomParser.parseDicom(byteArray)
        
        const metadata = getDicomMetadata(dataSet)
        
        const pixelElement = dataSet.elements['x7fe00010'] as any
        let pixelData: Uint16Array | Uint8Array | null = null
        
        if (pixelElement) {
          if ((pixelElement as any).bitsAllocated === 16) {
            pixelData = new Uint16Array(arrayBuffer, (pixelElement as any).dataOffset, (pixelElement as any).length / 2)
          } else if ((pixelElement as any).bitsAllocated === 8) {
            pixelData = new Uint8Array(arrayBuffer, (pixelElement as any).dataOffset, (pixelElement as any).length)
          }
        }
        
        resolve({
          metadata,
          pixelData: pixelData!,
          dataSet
        })
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

export function getDicomMetadata(dataSet: dicomParser.DataSet): DicomMetadata {
  return {
    patientName: dataSet.string('x00100010'),
    patientId: dataSet.string('x00100020'),
    studyDate: dataSet.string('x00080020'),
    seriesDate: dataSet.string('x00080021'),
    modality: dataSet.string('x00080060'),
    seriesDescription: dataSet.string('x0008103e'),
    rows: dataSet.uint16('x00280010'),
    columns: dataSet.uint16('x00280011'),
    sliceThickness: dataSet.floatString('x00180050'),
    pixelSpacing: dataSet.floatString('x00280030'),
    windowCenter: dataSet.floatString('x00281050'),
    windowWidth: dataSet.floatString('x00281051'),
    bitsAllocated: dataSet.uint16('x00280100'),
    bitsStored: dataSet.uint16('x00280101'),
    rescaleIntercept: dataSet.floatString('x00281052'),
    rescaleSlope: dataSet.floatString('x00281053')
  }
}

export function renderDicomSlice(
  pixelData: Uint16Array | Uint8Array,
  metadata: DicomMetadata,
  canvas: HTMLCanvasElement,
  windowCenter: number,
  windowWidth: number
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const rows = metadata.rows || 512
  const columns = metadata.columns || 512

  canvas.width = columns
  canvas.height = rows

  const imageDataArray = ctx.createImageData(columns, rows)
  const data = imageDataArray.data

  const intercept = metadata.rescaleIntercept || 0
  const slope = metadata.rescaleSlope || 1
  const wc = windowCenter
  const ww = windowWidth

  for (let i = 0; i < pixelData.length; i++) {
    const rawValue = pixelData[i]
    const huValue = rawValue * slope + intercept
    
    let normalized = (huValue - (wc - ww / 2)) / ww
    normalized = Math.max(0, Math.min(1, normalized))
    
    const grayValue = Math.floor(normalized * 255)
    
    data[i * 4] = grayValue
    data[i * 4 + 1] = grayValue
    data[i * 4 + 2] = grayValue
    data[i * 4 + 3] = 255
  }

  ctx.putImageData(imageDataArray, 0, 0)
}

export interface DicomMetadata {
  patientName?: string
  patientId?: string
  studyDate?: string
  seriesDate?: string
  modality?: string
  seriesDescription?: string
  rows?: number
  columns?: number
  sliceThickness?: number
  pixelSpacing?: number
  windowCenter?: number
  windowWidth?: number
  bitsAllocated?: number
  bitsStored?: number
  rescaleIntercept?: number
  rescaleSlope?: number
}

export interface DicomData {
  metadata: DicomMetadata
  pixelData: Uint16Array | Uint8Array
  dataSet: dicomParser.DataSet
}
