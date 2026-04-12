export interface MHDData {
  scalars: Float32Array
  dimensions: [number, number, number]
  spacing: [number, number, number]
  origin: [number, number, number]
  metadata: {
    patientName: string
    studyDate: string
    seriesDescription: string
    sliceThickness: number
    windowCenter: number
    windowWidth: number
  }
}

export interface MHDHeader {
  NDims: number
  DimSize: number[]
  ElementSpacing: number[]
  Offset: number[]
  ElementType: string
  ElementByteOrderMSB: boolean
  ElementDataFile: string
}

function parseMHDHeader(mhdContent: string): MHDHeader {
  const lines = mhdContent.split('\n')
  const header: any = {
    NDims: 3,
    DimSize: [],
    ElementSpacing: [],
    Offset: [0, 0, 0],
    ElementType: 'MET_SHORT',
    ElementByteOrderMSB: false,
    ElementDataFile: '',
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue

    const key = trimmed.substring(0, eqIndex).trim()
    const value = trimmed.substring(eqIndex + 1).trim()

    switch (key) {
      case 'NDims':
        header.NDims = parseInt(value)
        break
      case 'DimSize':
        header.DimSize = value.split(/\s+/).map(Number)
        break
      case 'ElementSpacing':
        header.ElementSpacing = value.split(/\s+/).map(Number)
        break
      case 'Offset':
        header.Offset = value.split(/\s+/).map(Number)
        break
      case 'ElementType':
        header.ElementType = value
        break
      case 'ElementByteOrderMSB':
        header.ElementByteOrderMSB = value === 'True'
        break
      case 'ElementDataFile':
        header.ElementDataFile = value
        break
    }
  }

  return header
}

function getBytesPerElement(elementType: string): number {
  switch (elementType) {
    case 'MET_UCHAR':
    case 'MET_CHAR':
      return 1
    case 'MET_USHORT':
    case 'MET_SHORT':
      return 2
    case 'MET_UINT':
    case 'MET_INT':
    case 'MET_FLOAT':
      return 4
    case 'MET_DOUBLE':
      return 8
    default:
      return 2
  }
}

function isSignedType(elementType: string): boolean {
  return elementType.includes('CHAR') || elementType.includes('SHORT') || elementType.includes('INT')
}

export async function loadMHDFile(mhdFile: File, rawFile?: File): Promise<MHDData> {
  const mhdContent = await mhdFile.text()
  const header = parseMHDHeader(mhdContent)

  console.log('MHD Header:', header)

  const dimensions: [number, number, number] = [
    header.DimSize[0] || 512,
    header.DimSize[1] || 512,
    header.DimSize[2] || 1,
  ]

  const spacing: [number, number, number] = [
    header.ElementSpacing[0] || 1,
    header.ElementSpacing[1] || 1,
    header.ElementSpacing[2] || 1,
  ]

  const origin: [number, number, number] = [
    header.Offset[0] || 0,
    header.Offset[1] || 0,
    header.Offset[2] || 0,
  ]

  let rawFileToUse = rawFile
  if (!rawFileToUse && header.ElementDataFile) {
    const mhdPath = mhdFile.name
    const rawFileName = header.ElementDataFile.replace('./', '')
    console.log('Looking for raw file:', rawFileName)
  }

  if (!rawFileToUse) {
    throw new Error('RAW file not found. Please select both .mhd and .raw files.')
  }

  const rawBuffer = await rawFileToUse.arrayBuffer()
  const bytesPerElement = getBytesPerElement(header.ElementType)
  const totalVoxels = dimensions[0] * dimensions[1] * dimensions[2]
  const expectedBytes = totalVoxels * bytesPerElement

  console.log('Expected bytes:', expectedBytes, 'Actual bytes:', rawBuffer.byteLength)

  let rawData: Int16Array | Uint16Array | Float32Array

  const littleEndian = !header.ElementByteOrderMSB

  switch (header.ElementType) {
    case 'MET_SHORT':
      rawData = new Int16Array(rawBuffer)
      break
    case 'MET_USHORT':
      rawData = new Uint16Array(rawBuffer)
      break
    case 'MET_FLOAT':
      rawData = new Float32Array(rawBuffer)
      break
    default:
      rawData = new Int16Array(rawBuffer)
  }

  const scalars = new Float32Array(totalVoxels)
  for (let i = 0; i < totalVoxels; i++) {
    scalars[i] = rawData[i]
  }

  const minVal = Math.min(...scalars.slice(0, Math.min(10000, scalars.length)))
  const maxVal = Math.max(...scalars.slice(0, Math.min(10000, scalars.length)))

  console.log('Data range (sample):', minVal, 'to', maxVal)

  return {
    scalars,
    dimensions,
    spacing,
    origin,
    metadata: {
      patientName: mhdFile.name.replace('.mhd', ''),
      studyDate: new Date().toISOString().split('T')[0],
      seriesDescription: 'LUNA16 CT Scan',
      sliceThickness: spacing[2],
      windowCenter: -600,
      windowWidth: 1500,
    },
  }
}

export async function loadMHDFromDirectory(directoryPath: string): Promise<MHDData[]> {
  const results: MHDData[] = []
  console.log('Loading MHD files from:', directoryPath)
  return results
}
