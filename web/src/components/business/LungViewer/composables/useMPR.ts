import { ref, computed, shallowRef } from 'vue'
import type { VolumeBuffer } from '../types'
import { WINDOW_LEVEL_PRESETS, type WindowLevelPreset } from '../types'

export type ORIENTATION = 'axial' | 'coronal' | 'sagittal'

export interface MPRState {
  orientation: ORIENTATION
  sliceIndex: number
  totalSlices: number
  windowCenter: number
  windowWidth: number
  zoom: number
  pan: { x: number; y: number }
  flippedX: boolean
  flippedY: boolean
  rotation: number
}

export interface CrosshairState {
  axial: { x: number; y: number } | null
  coronal: { x: number; y: number } | null
  sagittal: { x: number; y: number } | null
  worldPosition: { x: number; y: number; z: number } | null
}

export function useMPR() {
  const volumeBuffer = shallowRef<VolumeBuffer | null>(null)

  const axialSliceIndex = ref(0)
  const coronalSliceIndex = ref(0)
  const sagittalSliceIndex = ref(0)

  const axialImageData = shallowRef<ImageData | null>(null)
  const coronalImageData = shallowRef<ImageData | null>(null)
  const sagittalImageData = shallowRef<ImageData | null>(null)

  const windowCenter = ref(40)
  const windowWidth = ref(400)
  const zoom = ref(1)
  const pan = ref({ x: 0, y: 0 })

  const crosshair = ref<CrosshairState>({
    axial: null,
    coronal: null,
    sagittal: null,
    worldPosition: null
  })

  const activeViewport = ref<ORIENTATION>('axial')

  const axialTotalSlices = computed(() => volumeBuffer.value?.shape[2] || 1)
  const coronalTotalSlices = computed(() => volumeBuffer.value?.shape[1] || 1)
  const sagittalTotalSlices = computed(() => volumeBuffer.value?.shape[0] || 1)

  const currentPreset = computed((): WindowLevelPreset | null => {
    return WINDOW_LEVEL_PRESETS.find(
      p => Math.abs(p.windowCenter - windowCenter.value) < 10 && Math.abs(p.windowWidth - windowWidth.value) < 50
    ) || null
  })

  function extractSlice(buffer: VolumeBuffer, orientation: ORIENTATION, sliceIndex: number): ImageData {
    const { data, shape } = buffer
    const [width, height, depth] = shape

    let imgWidth: number
    let imgHeight: number

    switch (orientation) {
      case 'axial':
        imgWidth = width
        imgHeight = height
        break
      case 'coronal':
        imgWidth = width
        imgHeight = depth
        break
      case 'sagittal':
        imgWidth = height
        imgHeight = depth
        break
    }

    const imageData = new ImageData(imgWidth, imgHeight)
    const min = -1000
    const max = 300
    const range = max - min

    for (let y = 0; y < imgHeight; y++) {
      for (let x = 0; x < imgWidth; x++) {
        let volumeIndex: number

        switch (orientation) {
          case 'axial':
            volumeIndex = sliceIndex * width * height + y * width + x
            break
          case 'coronal':
            volumeIndex = y * width * height + sliceIndex * width + x
            break
          case 'sagittal':
            volumeIndex = y * width * height + x * width + sliceIndex
            break
          default:
            volumeIndex = 0
        }

        const huValue = data[volumeIndex] || -1000
        const normalized = Math.max(0, Math.min(1, (huValue - min) / range))
        const gray = Math.floor(normalized * 255)

        const idx = (y * imgWidth + x) * 4
        imageData.data[idx] = gray
        imageData.data[idx + 1] = gray
        imageData.data[idx + 2] = gray
        imageData.data[idx + 3] = 255
      }
    }

    return imageData
  }

  function setVolumeBuffer(buffer: VolumeBuffer) {
    volumeBuffer.value = buffer

    axialSliceIndex.value = Math.floor(buffer.shape[2] / 2)
    coronalSliceIndex.value = Math.floor(buffer.shape[1] / 2)
    sagittalSliceIndex.value = Math.floor(buffer.shape[0] / 2)

    updateAllSlices()
  }

  function updateAllSlices() {
    if (!volumeBuffer.value) return

    axialImageData.value = extractSlice(volumeBuffer.value, 'axial', axialSliceIndex.value)
    coronalImageData.value = extractSlice(volumeBuffer.value, 'coronal', coronalSliceIndex.value)
    sagittalImageData.value = extractSlice(volumeBuffer.value, 'sagittal', sagittalSliceIndex.value)
  }

  function setSliceIndex(orientation: ORIENTATION, index: number) {
    switch (orientation) {
      case 'axial':
        axialSliceIndex.value = Math.max(0, Math.min(index, axialTotalSlices.value - 1))
        axialImageData.value = volumeBuffer.value
          ? extractSlice(volumeBuffer.value, 'axial', axialSliceIndex.value)
          : null
        break
      case 'coronal':
        coronalSliceIndex.value = Math.max(0, Math.min(index, coronalTotalSlices.value - 1))
        coronalImageData.value = volumeBuffer.value
          ? extractSlice(volumeBuffer.value, 'coronal', coronalSliceIndex.value)
          : null
        break
      case 'sagittal':
        sagittalSliceIndex.value = Math.max(0, Math.min(index, sagittalTotalSlices.value - 1))
        sagittalImageData.value = volumeBuffer.value
          ? extractSlice(volumeBuffer.value, 'sagittal', sagittalSliceIndex.value)
          : null
        break
    }
  }

  function setWindowLevel(center: number, width: number) {
    windowCenter.value = Math.max(-1000, Math.min(center, 1000))
    windowWidth.value = Math.max(1, Math.min(width, 4000))
  }

  function setPreset(preset: WindowLevelPreset) {
    windowCenter.value = preset.windowCenter
    windowWidth.value = preset.windowWidth
  }

  function setZoom(newZoom: number) {
    zoom.value = Math.max(0.1, Math.min(newZoom, 20))
  }

  function setPan(newPan: { x: number; y: number }) {
    pan.value = { ...newPan }
  }

  function resetView() {
    zoom.value = 1
    pan.value = { x: 0, y: 0 }
    windowCenter.value = 40
    windowWidth.value = 400
  }

  function updateCrosshair(
    orientation: ORIENTATION,
    imageX: number,
    imageY: number
  ) {
    if (!volumeBuffer.value) return

    const { spacing, origin } = volumeBuffer.value
    const height = volumeBuffer.value.shape[1]

    let worldX = 0
    let worldY = 0
    let worldZ = 0

    switch (orientation) {
      case 'axial':
        worldX = origin[0] + imageX * spacing[0]
        worldY = origin[1] + (height - 1 - imageY) * spacing[1]
        worldZ = origin[2] + axialSliceIndex.value * spacing[2]

        coronalSliceIndex.value = Math.floor(imageY)
        sagittalSliceIndex.value = Math.floor(imageX)

        crosshair.value.axial = { x: imageX, y: imageY }
        crosshair.value.coronal = { x: imageX, y: axialSliceIndex.value }
        crosshair.value.sagittal = { x: imageY, y: axialSliceIndex.value }
        break

      case 'coronal':
        worldX = origin[0] + imageX * spacing[0]
        worldY = origin[1] + (height - 1 - coronalSliceIndex.value) * spacing[1]
        worldZ = origin[2] + imageY * spacing[2]

        axialSliceIndex.value = Math.floor(imageY)
        sagittalSliceIndex.value = Math.floor(imageX)

        crosshair.value.axial = { x: imageX, y: imageY }
        crosshair.value.coronal = { x: imageX, y: imageY }
        crosshair.value.sagittal = { x: coronalSliceIndex.value, y: imageY }
        break

      case 'sagittal':
        worldX = origin[0] + sagittalSliceIndex.value * spacing[0]
        worldY = origin[1] + (height - 1 - imageY) * spacing[1]
        worldZ = origin[2] + imageX * spacing[2]

        axialSliceIndex.value = Math.floor(imageY)
        coronalSliceIndex.value = Math.floor(imageX)

        crosshair.value.axial = { x: imageX, y: imageY }
        crosshair.value.coronal = { x: sagittalSliceIndex.value, y: imageX }
        crosshair.value.sagittal = { x: imageX, y: imageY }
        break
    }

    crosshair.value.worldPosition = { x: worldX, y: worldY, z: worldZ }

    updateAllSlices()
  }

  function imageToWorld(
    orientation: ORIENTATION,
    imageX: number,
    imageY: number,
    sliceIndex: number
  ): { x: number; y: number; z: number } {
    if (!volumeBuffer.value) return { x: 0, y: 0, z: 0 }

    const { spacing, origin } = volumeBuffer.value
    const height = volumeBuffer.value.shape[1]

    switch (orientation) {
      case 'axial':
        return {
          x: origin[0] + imageX * spacing[0],
          y: origin[1] + (height - 1 - imageY) * spacing[1],
          z: origin[2] + sliceIndex * spacing[2]
        }
      case 'coronal':
        return {
          x: origin[0] + imageX * spacing[0],
          y: origin[1] + (height - 1 - sliceIndex) * spacing[1],
          z: origin[2] + imageY * spacing[2]
        }
      case 'sagittal':
        return {
          x: origin[0] + sliceIndex * spacing[0],
          y: origin[1] + (height - 1 - imageY) * spacing[1],
          z: origin[2] + imageX * spacing[2]
        }
      default:
        return { x: 0, y: 0, z: 0 }
    }
  }

  function worldToImage(
    worldX: number,
    worldY: number,
    worldZ: number
  ): {
    axial: { x: number; y: number; sliceIndex: number }
    coronal: { x: number; y: number; sliceIndex: number }
    sagittal: { x: number; y: number; sliceIndex: number }
  } {
    if (!volumeBuffer.value) {
      return {
        axial: { x: 0, y: 0, sliceIndex: 0 },
        coronal: { x: 0, y: 0, sliceIndex: 0 },
        sagittal: { x: 0, y: 0, sliceIndex: 0 }
      }
    }

    const { spacing, origin, shape } = volumeBuffer.value
    const height = shape[1]

    return {
      axial: {
        x: Math.floor((worldX - origin[0]) / spacing[0]),
        y: Math.floor(height - 1 - (worldY - origin[1]) / spacing[1]),
        sliceIndex: Math.floor((worldZ - origin[2]) / spacing[2])
      },
      coronal: {
        x: Math.floor((worldX - origin[0]) / spacing[0]),
        y: Math.floor((worldZ - origin[2]) / spacing[2]),
        sliceIndex: Math.floor(height - 1 - (worldY - origin[1]) / spacing[1])
      },
      sagittal: {
        x: Math.floor((worldZ - origin[2]) / spacing[2]),
        y: Math.floor(height - 1 - (worldY - origin[1]) / spacing[1]),
        sliceIndex: Math.floor((worldX - origin[0]) / spacing[0])
      }
    }
  }

  function dispose() {
    axialImageData.value = null
    coronalImageData.value = null
    sagittalImageData.value = null
    volumeBuffer.value = null
    crosshair.value = {
      axial: null,
      coronal: null,
      sagittal: null,
      worldPosition: null
    }
  }

  return {
    volumeBuffer,
    axialSliceIndex,
    coronalSliceIndex,
    sagittalSliceIndex,
    axialImageData,
    coronalImageData,
    sagittalImageData,
    axialTotalSlices,
    coronalTotalSlices,
    sagittalTotalSlices,
    windowCenter,
    windowWidth,
    zoom,
    pan,
    crosshair,
    activeViewport,
    currentPreset,
    setVolumeBuffer,
    setSliceIndex,
    setWindowLevel,
    setPreset,
    setZoom,
    setPan,
    resetView,
    updateCrosshair,
    imageToWorld,
    worldToImage,
    dispose
  }
}
