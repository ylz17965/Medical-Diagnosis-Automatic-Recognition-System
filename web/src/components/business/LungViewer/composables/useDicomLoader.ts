import { ref, computed, shallowRef } from 'vue'
import type { DicomMetadata, DicomFile, DicomSeries, DicomPixelData, LoadProgress } from '../types'

interface ParsedDicom {
  metadata: DicomMetadata
  pixelData: DicomPixelData
}

export function useDicomLoader() {
  const isLoading = ref(false)
  const loadProgress = ref<LoadProgress>({ loaded: 0, total: 0, currentFile: '', percentage: 0 })
  const error = ref<Error | null>(null)
  const currentSeries = shallowRef<DicomSeries | null>(null)
  const currentFile = shallowRef<DicomFile | null>(null)

  function parseDicomBuffer(arrayBuffer: ArrayBuffer, fileName: string): Promise<ParsedDicom> {
    return new Promise((resolve, reject) => {
      try {
        const byteArray = new Uint8Array(arrayBuffer)
        const dataSet = parseDicomElements(byteArray)

        const rows = dataSet.uint16('x00280010') || 512
        const columns = dataSet.uint16('x00280011') || 512

        const pixelElement = dataSet.elements['x7fe00010']
        let pixelData: Int16Array | Uint8Array | Uint16Array | Int8Array | null = null
        let frames = 1

        if (pixelElement) {
          const bitsAllocated = dataSet.uint16('x00280100') || 16
          const length = pixelElement.length

          if (bitsAllocated === 16) {
            pixelData = new Int16Array(arrayBuffer, pixelElement.dataOffset, length / 2)
          } else if (bitsAllocated === 8) {
            pixelData = new Uint8Array(arrayBuffer, pixelElement.dataOffset, length)
          }
        }

        const numberOfFrames = dataSet.string('x00280008')
        if (numberOfFrames) {
          frames = parseInt(numberOfFrames, 10)
        }

        const rescaleIntercept = dataSet.floatString('x00281052') || 0
        const rescaleSlope = dataSet.floatString('x00281053') || 1

        const windowCenter = dataSet.floatString('x00281050') || 40
        const windowWidth = dataSet.floatString('x00281051') || 400

        const sliceThickness = dataSet.floatString('x00180050') || 1

        const pixelSpacingStr = dataSet.floatString('x00280030')
        let pixelSpacing: [number, number] = [1, 1]
        if (pixelSpacingStr) {
          const parts = pixelSpacingStr.split('\\')
          if (parts.length >= 2) {
            pixelSpacing = [parseFloat(parts[0]), parseFloat(parts[1])]
          }
        }

        const imagePositionPatientStr = dataSet.string('x00200032')
        const imagePositionPatient: [number, number, number] | undefined = imagePositionPatientStr
          ? parseFloatArray3(imagePositionPatientStr)
          : undefined

        const imageOrientationPatientStr = dataSet.string('x00200037')
        const imageOrientationPatient: [number, number, number, number, number, number] | undefined = imageOrientationPatientStr
          ? parseFloatArray6(imageOrientationPatientStr)
          : undefined

        const metadata: DicomMetadata = {
          patientName: cleanString(dataSet.string('x00100010') || ''),
          patientId: dataSet.string('x00100020') || '',
          studyDate: formatDate(dataSet.string('x00080020') || ''),
          seriesDate: formatDate(dataSet.string('x00080021') || ''),
          seriesInstanceUid: dataSet.string('x0020000e') || generateUID(),
          sopInstanceUid: dataSet.string('x00080018') || generateUID(),
          modality: (dataSet.string('x00080060') as DicomMetadata['modality']) || 'CT',
          seriesDescription: dataSet.string('x0008103e') || '',
          rows,
          columns,
          sliceThickness,
          pixelSpacing,
          windowCenter,
          windowWidth,
          bitsAllocated: dataSet.uint16('x00280100') || 16,
          bitsStored: dataSet.uint16('x00280101') || 16,
          rescaleIntercept,
          rescaleSlope,
          numberOfFrames: frames,
          imagePositionPatient,
          imageOrientationPatient
        }

        resolve({
          metadata,
          pixelData: {
            pixelData: pixelData || new Int16Array(rows * columns * frames),
            rows,
            columns,
            frames
          }
        })
      } catch (err) {
        reject(new Error(`解析 DICOM 文件失败: ${fileName}, ${err instanceof Error ? err.message : 'Unknown error'}`))
      }
    })
  }

  function parseDicomElements(byteArray: Uint8Array): any {
    let offset = 128
    const preamble = String.fromCharCode(...byteArray.slice(0, 128))
    if (preamble.includes('DICM')) {
      offset = 132
    }

    const elements: Record<string, any> = {}

    function readUint16(): number {
      const val = new DataView(byteArray.buffer).getUint16(offset, false)
      offset += 2
      return val
    }

    function readUint32(): number {
      const val = new DataView(byteArray.buffer).getUint32(offset, false)
      offset += 4
      return val
    }

    function readTag(): void {
      while (offset < byteArray.length - 8) {
        const group = readUint16()
        const element = readUint16()
        const tag = `${group.toString(16).padStart(4, '0')}${element.toString(16).padStart(4, '0')}`

        let vr = ''
        let length = 0

        if (group === 0xfffe) {
          length = readUint32()
          if (length === 0xffffffff) {
            elements[tag] = { dataOffset: offset, length: 0, value: null, vr: 'OB' }
            continue
          }
          offset += length
          continue
        }

        if (tag === 'x7fe00010') {
          vr = 'OB'
          offset += 2
          length = readUint32()
          const dataOffset = offset
          elements[tag] = { dataOffset, length, vr, value: null }
          offset += length
          continue
        }

        if (tag === 'x00280010') { vr = 'US'; length = 2 }
        else if (tag === 'x00280011') { vr = 'US'; length = 2 }
        else if (tag === 'x00280100') { vr = 'US'; length = 2 }
        else if (tag === 'x00280101') { vr = 'US'; length = 2 }
        else if (tag === 'x00281050') { vr = 'DS'; length = readUint16() }
        else if (tag === 'x00281051') { vr = 'DS'; length = readUint16() }
        else if (tag === 'x00281052') { vr = 'DS'; length = readUint16() }
        else if (tag === 'x00281053') { vr = 'DS'; length = readUint16() }
        else if (tag === 'x00180050') { vr = 'DS'; length = readUint16() }
        else if (tag === 'x00280030') { vr = 'DS'; length = readUint16() }
        else if (tag === 'x00200032') { vr = 'DS'; length = readUint16() }
        else if (tag === 'x00200037') { vr = 'DS'; length = readUint16() }
        else if (tag === 'x00280008') { vr = 'IS'; length = readUint16() }
        else if (tag === 'x00080018') { vr = 'UI'; length = readUint16() }
        else if (tag === 'x0020000e') { vr = 'UI'; length = readUint16() }
        else if (tag === 'x00080020') { vr = 'DA'; length = readUint16() }
        else if (tag === 'x00080021') { vr = 'DA'; length = readUint16() }
        else if (tag === 'x00080060') { vr = 'CS'; length = readUint16() }
        else if (tag === 'x00100010') { vr = 'PN'; length = readUint16() }
        else if (tag === 'x00100020') { vr = 'LO'; length = readUint16() }
        else if (tag === 'x0008103e') { vr = 'LO'; length = readUint16() }
        else if (tag === 'x7fe00010') { vr = 'OB'; length = readUint32() }
        else { vr = 'OB'; length = readUint32() }

        if (length === 0xffffffff) {
          elements[tag] = { dataOffset: offset, length: 0, vr, value: null }
          continue
        }

        const valueBytes = byteArray.slice(offset, offset + length)
        let value: any = null

        switch (vr) {
          case 'US':
            value = valueBytes.length >= 2 ? new DataView(valueBytes.buffer).getUint16(0, false) : 0
            break
          case 'DS':
          case 'LO':
          case 'CS':
          case 'DA':
          case 'PN':
          case 'IS':
            value = new TextDecoder().decode(valueBytes).trim()
            if (value.endsWith('\0')) value = value.slice(0, -1)
            break
          case 'UI':
            value = new TextDecoder().decode(valueBytes).trim().replace(/\0/g, '')
            break
          case 'OB':
          default:
            value = valueBytes
        }

        elements[tag] = { dataOffset: offset, length, vr, value }
        offset += length
      }
    }

    const dataSet = {
      elements,
      uint16: (tag: string) => {
        const el = elements[tag]
        return el ? el.value : undefined
      },
      uint32: (tag: string) => {
        const el = elements[tag]
        return el ? el.value : undefined
      },
      floatString: (tag: string) => {
        const el = elements[tag]
        return el && typeof el.value === 'string' ? parseFloat(el.value) : undefined
      },
      string: (tag: string) => {
        const el = elements[tag]
        return el ? el.value : undefined
      }
    }

    readTag()
    return dataSet
  }

  function cleanString(str: string): string {
    if (!str) return ''
    return str.replace(/\^|\/|\s+$/g, ' ').trim()
  }

  function formatDate(dateStr: string): string {
    if (!dateStr || dateStr.length !== 8) return dateStr
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
  }

  function parseFloatArray3(str: string): [number, number, number] {
    const parts = str.split('\\').map(p => parseFloat(p))
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0]
  }

  function parseFloatArray6(str: string): [number, number, number, number, number, number] {
    const parts = str.split('\\').map(p => parseFloat(p))
    return [
      parts[0] || 0, parts[1] || 0, parts[2] || 0,
      parts[3] || 0, parts[4] || 0, parts[5] || 0
    ]
  }

  function generateUID(): string {
    return '2.25.' + Array.from({ length: 39 }, () => Math.floor(Math.random() * 10)).join('')
  }

  async function loadFile(file: File): Promise<DicomFile> {
    isLoading.value = true
    error.value = null
    loadProgress.value = { loaded: 0, total: 100, currentFile: file.name, percentage: 0 }

    try {
      loadProgress.value.percentage = 30

      const arrayBuffer = await file.arrayBuffer()

      loadProgress.value.percentage = 60

      const parsed = await parseDicomBuffer(arrayBuffer, file.name)

      loadProgress.value.percentage = 90

      const dicomFile: DicomFile = {
        file,
        metadata: parsed.metadata,
        pixelData: parsed.pixelData
      }

      loadProgress.value.percentage = 100
      currentFile.value = dicomFile

      return dicomFile
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Unknown error')
      throw error.value
    } finally {
      isLoading.value = false
    }
  }

  async function loadSeries(files: File[]): Promise<DicomSeries> {
    if (files.length === 0) {
      throw new Error('No files provided')
    }

    isLoading.value = true
    error.value = null
    loadProgress.value = {
      loaded: 0,
      total: files.length,
      currentFile: '',
      percentage: 0
    }

    try {
      const instances: DicomFile[] = []
      let seriesUid = ''

      for (let i = 0; i < files.length; i++) {
        loadProgress.value.currentFile = files[i].name
        loadProgress.value.loaded = i
        loadProgress.value.percentage = Math.round((i / files.length) * 100)

        const instance = await loadFile(files[i])
        instances.push(instance)

        if (!seriesUid && instance.metadata.seriesInstanceUid) {
          seriesUid = instance.metadata.seriesInstanceUid
        }
      }

      instances.sort((a, b) => {
        const posA = a.metadata.imagePositionPatient
        const posB = b.metadata.imagePositionPatient
        if (posA && posB) {
          return posA[2] - posB[2]
        }
        return 0
      })

      const firstInstance = instances[0]

      const series: DicomSeries = {
        seriesInstanceUid: seriesUid || generateUID(),
        seriesDescription: firstInstance.metadata.seriesDescription || 'CT Series',
        modality: firstInstance.metadata.modality,
        seriesNumber: 1,
        instances,
        numberOfSlices: instances.length
      }

      loadProgress.value.percentage = 100
      currentSeries.value = series

      return series
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Unknown error')
      throw error.value
    } finally {
      isLoading.value = false
    }
  }

  function getPixelValue(pixelData: DicomPixelData, x: number, y: number, z: number = 0): number {
    const { rows, columns } = pixelData
    const index = z * rows * columns + y * columns + x

    if (index < 0 || index >= pixelData.pixelData.length) {
      return 0
    }

    return pixelData.pixelData[index]
  }

  function getHUVaule(pixelData: DicomPixelData, metadata: DicomMetadata, x: number, y: number, z: number = 0): number {
    const rawValue = getPixelValue(pixelData, x, y, z)
    return rawValue * metadata.rescaleSlope + metadata.rescaleIntercept
  }

  const hasData = computed(() => currentFile.value !== null || currentSeries.value !== null)
  const numberOfSlices = computed(() => currentSeries.value?.numberOfSlices || 1)
  const metadata = computed(() => currentSeries.value?.instances[0]?.metadata || currentFile.value?.metadata || null)

  function reset() {
    currentFile.value = null
    currentSeries.value = null
    error.value = null
    loadProgress.value = { loaded: 0, total: 0, currentFile: '', percentage: 0 }
  }

  return {
    isLoading,
    loadProgress,
    error,
    currentSeries,
    currentFile,
    hasData,
    numberOfSlices,
    metadata,
    loadFile,
    loadSeries,
    getPixelValue,
    getHUVaule,
    reset
  }
}
