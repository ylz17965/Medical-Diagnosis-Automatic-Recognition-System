import { ref, computed, shallowRef } from 'vue'
import * as THREE from 'three'
import type { DicomSeries, VolumeBuffer, VolumeTexture3D } from '../types'
import type { SyntheticLungData } from '../utils/syntheticData'

export function useVolumeBuilder() {
  const isProcessing = ref(false)
  const processingProgress = ref(0)
  const error = ref<Error | null>(null)
  const volumeBuffer = shallowRef<VolumeBuffer | null>(null)
  const volumeTexture = shallowRef<VolumeTexture3D | null>(null)

  function seriesToVolumeBuffer(series: DicomSeries): VolumeBuffer {
    if (series.instances.length === 0) {
      throw new Error('Series has no instances')
    }

    const firstInstance = series.instances[0]
    const { rows, columns } = firstInstance.metadata
    const numSlices = series.instances.length

    const shape: [number, number, number] = [columns, rows, numSlices]
    const data = new Float32Array(columns * rows * numSlices)

    const firstMeta = firstInstance.metadata
    const spacing: [number, number, number] = [
      firstMeta.pixelSpacing?.[0] || 1,
      firstMeta.pixelSpacing?.[1] || 1,
      firstMeta.sliceThickness || 1
    ]

    const origin: [number, number, number] = firstMeta.imagePositionPatient || [0, 0, 0]

    const direction: [number, number, number, number, number, number, number, number, number] =
      firstMeta.imageOrientationPatient
        ? [firstMeta.imageOrientationPatient[0], firstMeta.imageOrientationPatient[1], firstMeta.imageOrientationPatient[2],
           firstMeta.imageOrientationPatient[3], firstMeta.imageOrientationPatient[4], firstMeta.imageOrientationPatient[5],
           0, 0, 0]
        : [1, 0, 0, 0, 1, 0, 0, 0, 1]

    for (let slice = 0; slice < series.instances.length; slice++) {
      const instance = series.instances[slice]
      const pixelData = instance.pixelData.pixelData

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
          const bufferIndex = slice * rows * columns + y * columns + x
          const pixelIndex = y * columns + x

          if (pixelIndex < pixelData.length) {
            const rawValue = pixelData[pixelIndex]
            const huValue = rawValue * firstMeta.rescaleSlope + firstMeta.rescaleIntercept
            data[bufferIndex] = huValue
          }
        }
      }
    }

    return {
      data,
      shape,
      spacing,
      origin,
      direction
    }
  }

  function createNormalizedTexture(volumeBuffer: VolumeBuffer, targetMin: number = -1000, targetMax: number = 300): VolumeTexture3D {
    const { data, shape } = volumeBuffer

    let min = Infinity
    let max = -Infinity

    for (let i = 0; i < data.length; i++) {
      const value = data[i]
      if (value > -3024) {
        if (value < min) min = value
        if (value > max) max = value
      }
    }

    const range = max - min
    const normalizedData = new Uint8Array(data.length)

    for (let i = 0; i < data.length; i++) {
      const normalized = (data[i] - min) / range
      normalizedData[i] = Math.floor(Math.max(0, Math.min(255, normalized * 255)))
    }

    const texture = new THREE.Data3DTexture(
      normalizedData,
      shape[0],
      shape[1],
      shape[2]
    )

    texture.format = THREE.RedFormat
    texture.type = THREE.UnsignedByteType
    texture.internalFormat = 'R8UI'
    texture.unpackAlignment = 1
    texture.needsUpdate = true

    return {
      texture,
      min: targetMin,
      max: targetMax
    }
  }

  function extractAxialSlice(volumeBuffer: VolumeBuffer, sliceIndex: number): ImageData {
    const { data, shape } = volumeBuffer
    const [width, height] = [shape[0], shape[1]]

    const imageData = new ImageData(width, height)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const volumeIndex = sliceIndex * width * height + y * width + x
        const pixelValue = data[volumeIndex]
        const gray = Math.max(0, Math.min(255, Math.floor(((pixelValue + 1000) / 2000) * 255)))

        const idx = (y * width + x) * 4
        imageData.data[idx] = gray
        imageData.data[idx + 1] = gray
        imageData.data[idx + 2] = gray
        imageData.data[idx + 3] = 255
      }
    }

    return imageData
  }

  function extractCoronalSlice(volumeBuffer: VolumeBuffer, sliceIndex: number): ImageData {
    const { data, shape } = volumeBuffer
    const [width, , depth] = [shape[0], shape[1], shape[2]]

    const imageData = new ImageData(width, depth)

    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        const volumeIndex = z * width * shape[1] + sliceIndex * width + x
        const pixelValue = data[volumeIndex]
        const gray = Math.max(0, Math.min(255, Math.floor(((pixelValue + 1000) / 2000) * 255)))

        const idx = (z * width + x) * 4
        imageData.data[idx] = gray
        imageData.data[idx + 1] = gray
        imageData.data[idx + 2] = gray
        imageData.data[idx + 3] = 255
      }
    }

    return imageData
  }

  function extractSagittalSlice(volumeBuffer: VolumeBuffer, sliceIndex: number): ImageData {
    const { data, shape } = volumeBuffer
    const [, height, depth] = [shape[0], shape[1], shape[2]]

    const imageData = new ImageData(height, depth)

    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        const volumeIndex = z * shape[0] * shape[1] + y * shape[0] + sliceIndex
        const pixelValue = data[volumeIndex]
        const gray = Math.max(0, Math.min(255, Math.floor(((pixelValue + 1000) / 2000) * 255)))

        const idx = (z * height + y) * 4
        imageData.data[idx] = gray
        imageData.data[idx + 1] = gray
        imageData.data[idx + 2] = gray
        imageData.data[idx + 3] = 255
      }
    }

    return imageData
  }

  function applyWindowLevel(
    imageData: ImageData,
    windowCenter: number,
    windowWidth: number
  ): ImageData {
    const min = windowCenter - windowWidth / 2
    const max = windowCenter + windowWidth / 2
    const range = max - min

    const result = new ImageData(imageData.width, imageData.height)

    for (let i = 0; i < imageData.data.length; i += 4) {
      const value = imageData.data[i]

      let normalized = (value - min) / range
      normalized = Math.max(0, Math.min(1, normalized))

      const output = Math.floor(normalized * 255)

      result.data[i] = output
      result.data[i + 1] = output
      result.data[i + 2] = output
      result.data[i + 3] = 255
    }

    return result
  }

  async function buildVolumeFromSeries(series: DicomSeries): Promise<VolumeBuffer> {
    isProcessing.value = true
    processingProgress.value = 0
    error.value = null

    try {
      processingProgress.value = 20

      const buffer = seriesToVolumeBuffer(series)

      processingProgress.value = 80

      volumeBuffer.value = buffer

      processingProgress.value = 100

      return buffer
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Unknown error')
      throw error.value
    } finally {
      isProcessing.value = false
    }
  }

  function buildVolumeFromSynthetic(syntheticData: SyntheticLungData): VolumeBuffer {
    const { volumeData: data, shape, spacing } = syntheticData

    const volumeData = new Float32Array(data.length)
    for (let i = 0; i < data.length; i++) {
      volumeData[i] = data[i]
    }

    const origin: [number, number, number] = [0, 0, 0]
    const direction: [number, number, number, number, number, number, number, number, number] = [1, 0, 0, 0, 1, 0, 0, 0, 1]

    const buffer: VolumeBuffer = {
      data: volumeData,
      shape,
      spacing,
      origin,
      direction
    }

    volumeBuffer.value = buffer
    return buffer
  }

  function buildTextureFromBuffer(buffer?: VolumeBuffer): VolumeTexture3D | null {
    const targetBuffer = buffer || volumeBuffer.value
    if (!targetBuffer) return null

    return createNormalizedTexture(targetBuffer)
  }

  function getVolumeWorldBounds(buffer: VolumeBuffer): {
    min: THREE.Vector3
    max: THREE.Vector3
    size: THREE.Vector3
    center: THREE.Vector3
  } {
    const { shape, spacing, origin } = buffer

    const width = shape[0] * spacing[0]
    const height = shape[1] * spacing[1]
    const depth = shape[2] * spacing[2]

    const min = new THREE.Vector3(origin[0], origin[1], origin[2])
    const max = new THREE.Vector3(
      origin[0] + width,
      origin[1] + height,
      origin[2] + depth
    )
    const size = new THREE.Vector3(width, height, depth)
    const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5)

    return { min, max, size, center }
  }

  function dispose() {
    if (volumeTexture.value) {
      volumeTexture.value.texture.dispose()
      volumeTexture.value = null
    }
    volumeBuffer.value = null
    error.value = null
  }

  const hasVolume = computed(() => volumeBuffer.value !== null)
  const volumeShape = computed(() => volumeBuffer.value?.shape || null)
  const volumeSpacing = computed(() => volumeBuffer.value?.spacing || null)

  return {
    isProcessing,
    processingProgress,
    error,
    volumeBuffer,
    volumeTexture,
    hasVolume,
    volumeShape,
    volumeSpacing,
    buildVolumeFromSeries,
    buildVolumeFromSynthetic,
    buildTextureFromBuffer,
    extractAxialSlice,
    extractCoronalSlice,
    extractSagittalSlice,
    applyWindowLevel,
    getVolumeWorldBounds,
    dispose
  }
}
