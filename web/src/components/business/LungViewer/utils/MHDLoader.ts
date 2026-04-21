import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData'
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray'
import createLogger from '@/utils/logger'

const log = createLogger('MHDLoader')

export interface MHDMetadata {
  objectType: string
  dim: [number, number, number]
  elementSpacing: [number, number, number]
  elementSize: [number, number, number]
  elementType: string
  elementDataFile: string
  binaryData: boolean
  binaryDataByteOrderMSB: boolean
  compressedData: boolean
  centerOfRotation: [number, number, number]
  offset: [number, number, number]
}

export interface MHDVolume {
  imageData: vtkImageData
  metadata: MHDMetadata
  scalarRange: [number, number]
}

const ELEMENT_TYPE_MAP: Record<string, { bytes: number; signed: boolean }> = {
  'MET_CHAR': { bytes: 1, signed: false },
  'MET_UCHAR': { bytes: 1, signed: false },
  'MET_SHORT': { bytes: 2, signed: true },
  'MET_USHORT': { bytes: 2, signed: false },
  'MET_INT': { bytes: 4, signed: true },
  'MET_UINT': { bytes: 4, signed: false },
  'MET_FLOAT': { bytes: 4, signed: true },
  'MET_DOUBLE': { bytes: 8, signed: true },
}

function parseMHDHeader(headerText: string): MHDMetadata {
  const lines = headerText.split('\n')
  const metadata: Partial<MHDMetadata> = {}

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue

    const key = trimmed.substring(0, eqIndex).trim()
    const value = trimmed.substring(eqIndex + 1).trim()

    switch (key) {
      case 'ObjectType':
        metadata.objectType = value
        break
      case 'NDims':
        metadata.dim = [1, 1, 1]
        break
      case 'DimSize':
        metadata.dim = value.split(/\s+/).map(Number) as [number, number, number]
        break
      case 'ElementSpacing':
        metadata.elementSpacing = value.split(/\s+/).map(Number) as [number, number, number]
        break
      case 'ElementSize':
        metadata.elementSize = value.split(/\s+/).map(Number) as [number, number, number]
        break
      case 'ElementType':
        metadata.elementType = value
        break
      case 'ElementDataFile':
        metadata.elementDataFile = value
        break
      case 'BinaryData':
        metadata.binaryData = value.toLowerCase() === 'true'
        break
      case 'BinaryDataByteOrderMSB':
        metadata.binaryDataByteOrderMSB = value.toLowerCase() === 'true'
        break
      case 'CompressedData':
        metadata.compressedData = value.toLowerCase() === 'true'
        break
      case 'CenterOfRotation':
        metadata.centerOfRotation = value.split(/\s+/).map(Number) as [number, number, number]
        break
      case 'Offset':
      case 'Position':
        metadata.offset = value.split(/\s+/).map(Number) as [number, number, number]
        break
    }
  }

  metadata.dim = metadata.dim || [1, 1, 1]
  metadata.elementSpacing = metadata.elementSpacing || [1, 1, 1]
  metadata.elementSize = metadata.elementSize || [1, 1, 1]
  metadata.elementType = metadata.elementType || 'MET_SHORT'
  metadata.binaryData = metadata.binaryData ?? true
  metadata.binaryDataByteOrderMSB = metadata.binaryDataByteOrderMSB ?? false
  metadata.compressedData = metadata.compressedData ?? false
  metadata.offset = metadata.offset || [0, 0, 0]
  metadata.centerOfRotation = metadata.centerOfRotation || [0, 0, 0]

  return metadata as MHDMetadata
}

function swapBytes(arrayBuffer: ArrayBuffer, bytes: number): ArrayBuffer {
  if (bytes === 1) return arrayBuffer

  const view = new DataView(arrayBuffer)
  const result = new ArrayBuffer(arrayBuffer.byteLength)
  const resultView = new DataView(result)

  for (let i = 0; i < arrayBuffer.byteLength; i += bytes) {
    for (let j = 0; j < bytes; j++) {
      resultView.setUint8(i + j, view.getUint8(i + bytes - 1 - j))
    }
  }

  return result
}

async function decompressGzip(data: ArrayBuffer): Promise<ArrayBuffer> {
  const ds = new DecompressionStream('gzip')
  const writer = ds.writable.getWriter()
  writer.write(new Uint8Array(data))
  writer.close()

  const reader = ds.readable.getReader()
  const chunks: Uint8Array[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return result.buffer
}

export async function loadMHDFile(mhdFile: File, rawFile?: File): Promise<MHDVolume> {
  log.info('Loading MHD file', { name: mhdFile.name })

  const headerText = await mhdFile.text()
  const metadata = parseMHDHeader(headerText)

  log.info('MHD metadata parsed', { 
    dim: metadata.dim,
    elementType: metadata.elementType,
    compressed: metadata.compressedData
  })

  let rawData: ArrayBuffer

  if (rawFile) {
    rawData = await rawFile.arrayBuffer()
  } else if (metadata.elementDataFile && metadata.elementDataFile !== 'LOCAL') {
    throw new Error('External RAW file specified but not provided')
  } else {
    const headerEndIndex = headerText.indexOf('ElementDataFile')
    if (headerEndIndex !== -1) {
      const lineEndIndex = headerText.indexOf('\n', headerEndIndex)
      const headerLength = lineEndIndex !== -1 ? lineEndIndex + 1 : headerEndIndex + 100
      
      const fullArrayBuffer = await mhdFile.arrayBuffer()
      rawData = fullArrayBuffer.slice(headerLength)
    } else {
      throw new Error('Cannot find data in MHD file')
    }
  }

  if (metadata.compressedData) {
    log.info('Decompressing gzip data')
    rawData = await decompressGzip(rawData)
  }

  const elementInfo = ELEMENT_TYPE_MAP[metadata.elementType] || { bytes: 2, signed: true }
  const { bytes } = elementInfo

  const isLittleEndian = !metadata.binaryDataByteOrderMSB
  const systemLittleEndian = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1

  if (isLittleEndian !== systemLittleEndian) {
    log.info('Swapping byte order')
    rawData = swapBytes(rawData, bytes)
  }

  const [width, height, depth] = metadata.dim
  const expectedSize = width * height * depth * bytes

  if (rawData.byteLength < expectedSize) {
    throw new Error(`Data size mismatch: expected ${expectedSize}, got ${rawData.byteLength}`)
  }

  let floatData: Float32Array

  switch (metadata.elementType) {
    case 'MET_CHAR':
    case 'MET_UCHAR':
      floatData = new Float32Array(new Uint8Array(rawData))
      break
    case 'MET_SHORT':
      floatData = new Float32Array(new Int16Array(rawData))
      break
    case 'MET_USHORT':
      floatData = new Float32Array(new Uint16Array(rawData))
      break
    case 'MET_INT':
      floatData = new Float32Array(new Int32Array(rawData))
      break
    case 'MET_UINT':
      floatData = new Float32Array(new Uint32Array(rawData))
      break
    case 'MET_FLOAT':
      floatData = new Float32Array(rawData)
      break
    case 'MET_DOUBLE': {
      const doubleData = new Float64Array(rawData)
      floatData = new Float32Array(doubleData.length)
      for (let i = 0; i < doubleData.length; i++) {
        floatData[i] = doubleData[i]
      }
      break
    }
    default:
      floatData = new Float32Array(new Int16Array(rawData))
  }

  const imageData = vtkImageData.newInstance()
  imageData.setDimensions(width, height, depth)
  imageData.setSpacing(metadata.elementSpacing)
  imageData.setOrigin(metadata.offset)

  const scalars = vtkDataArray.newInstance({
    name: 'CT',
    numberOfComponents: 1,
    values: floatData,
  })

  imageData.getPointData().setScalars(scalars)

  let min = floatData[0]
  let max = floatData[0]
  for (let i = 1; i < floatData.length; i++) {
    if (floatData[i] < min) min = floatData[i]
    if (floatData[i] > max) max = floatData[i]
  }

  log.info('MHD volume loaded', {
    dimensions: [width, height, depth],
    scalarRange: [min, max],
    spacing: metadata.elementSpacing,
  })

  return {
    imageData,
    metadata,
    scalarRange: [min, max],
  }
}

export async function loadMHDFromFiles(files: FileList | File[]): Promise<MHDVolume> {
  const fileArray = Array.from(files)
  
  const mhdFile = fileArray.find(f => f.name.toLowerCase().endsWith('.mhd') || f.name.toLowerCase().endsWith('.mha'))
  if (!mhdFile) {
    throw new Error('No MHD/MHA file found')
  }

  const rawFile = fileArray.find(f => 
    f.name.toLowerCase().endsWith('.raw') || 
    f.name.toLowerCase().endsWith('.zraw')
  )

  return loadMHDFile(mhdFile, rawFile)
}

export function isMHDFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return name.endsWith('.mhd') || name.endsWith('.mha')
}

export function isRAWFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return name.endsWith('.raw') || name.endsWith('.zraw')
}
