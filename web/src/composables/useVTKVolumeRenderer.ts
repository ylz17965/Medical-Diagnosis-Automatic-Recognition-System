import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import '@kitware/vtk.js/Rendering/Profiles/Volume'

export interface WindowPreset {
  name: string
  center: number
  width: number
  colorPoints: [number, number, number, number][]
  opacityPoints: [number, number][]
}

export const WINDOW_PRESETS: Record<string, WindowPreset> = {
  lung: {
    name: '肺窗',
    center: -600,
    width: 1500,
    colorPoints: [
      [-1000, 0.0, 0.0, 0.0],
      [-950, 0.1, 0.15, 0.2],
      [-900, 0.2, 0.3, 0.4],
      [-850, 0.4, 0.5, 0.6],
      [-800, 0.6, 0.65, 0.7],
      [-700, 0.8, 0.8, 0.85],
      [-600, 0.95, 0.9, 0.9],
      [-500, 1.0, 0.95, 0.9],
      [-400, 0.9, 0.85, 0.8],
      [-300, 0.7, 0.65, 0.6],
      [-200, 0.5, 0.45, 0.4],
      [-100, 0.3, 0.25, 0.2],
      [0, 0.15, 0.12, 0.1],
      [100, 0.1, 0.08, 0.05],
    ],
    opacityPoints: [
      [-1000, 0.0],
      [-950, 0.0],
      [-900, 0.1],
      [-850, 0.3],
      [-800, 0.5],
      [-700, 0.7],
      [-600, 0.85],
      [-500, 0.9],
      [-400, 0.6],
      [-300, 0.3],
      [-200, 0.1],
      [-100, 0.02],
      [0, 0.0],
      [100, 0.0],
    ],
  },
  lungOnly: {
    name: '仅肺部',
    center: -700,
    width: 400,
    colorPoints: [
      [-1000, 0.0, 0.0, 0.0],
      [-950, 0.2, 0.35, 0.5],
      [-900, 0.5, 0.65, 0.8],
      [-850, 0.75, 0.85, 0.95],
      [-800, 0.95, 0.98, 1.0],
      [-750, 1.0, 1.0, 1.0],
      [-700, 0.95, 0.92, 0.95],
      [-650, 0.8, 0.75, 0.8],
      [-600, 0.55, 0.5, 0.55],
      [-550, 0.25, 0.2, 0.25],
    ],
    opacityPoints: [
      [-1000, 0.0],
      [-950, 0.0],
      [-900, 0.4],
      [-850, 0.75],
      [-800, 1.0],
      [-750, 1.0],
      [-700, 0.9],
      [-650, 0.5],
      [-600, 0.15],
      [-550, 0.0],
    ],
  },
  lungAndVessels: {
    name: '肺部+血管',
    center: -400,
    width: 1200,
    colorPoints: [
      [-1000, 0.0, 0.0, 0.0],
      [-950, 0.15, 0.25, 0.35],
      [-900, 0.35, 0.5, 0.6],
      [-850, 0.55, 0.65, 0.75],
      [-800, 0.75, 0.8, 0.85],
      [-700, 0.95, 0.95, 0.98],
      [-600, 0.85, 0.85, 0.9],
      [-500, 0.6, 0.55, 0.6],
      [-400, 0.3, 0.25, 0.3],
      [-300, 0.1, 0.08, 0.1],
      [-200, 0.0, 0.0, 0.0],
      [-50, 0.0, 0.0, 0.0],
      [0, 0.3, 0.15, 0.15],
      [30, 0.7, 0.35, 0.3],
      [50, 0.9, 0.5, 0.45],
      [80, 1.0, 0.65, 0.6],
      [100, 1.0, 0.8, 0.75],
      [150, 1.0, 0.95, 0.9],
      [200, 0.9, 0.85, 0.8],
      [300, 0.5, 0.45, 0.4],
      [400, 0.2, 0.15, 0.1],
    ],
    opacityPoints: [
      [-1000, 0.0],
      [-950, 0.0],
      [-900, 0.2],
      [-850, 0.5],
      [-800, 0.75],
      [-700, 0.95],
      [-600, 0.85],
      [-500, 0.5],
      [-400, 0.15],
      [-300, 0.02],
      [-200, 0.0],
      [-50, 0.0],
      [0, 0.0],
      [30, 0.3],
      [50, 0.6],
      [80, 0.85],
      [100, 0.95],
      [150, 0.9],
      [200, 0.7],
      [300, 0.3],
      [400, 0.05],
    ],
  },
  mediastinal: {
    name: '纵隔窗',
    center: 40,
    width: 400,
    colorPoints: [
      [-150, 0.0, 0.0, 0.0],
      [-50, 0.15, 0.15, 0.15],
      [0, 0.35, 0.35, 0.35],
      [40, 0.55, 0.55, 0.55],
      [80, 0.75, 0.75, 0.75],
      [120, 0.9, 0.9, 0.9],
      [200, 1.0, 1.0, 1.0],
      [400, 1.0, 1.0, 1.0],
    ],
    opacityPoints: [
      [-150, 0.0],
      [-50, 0.05],
      [0, 0.15],
      [40, 0.35],
      [80, 0.55],
      [120, 0.75],
      [200, 0.95],
      [400, 1.0],
    ],
  },
  bone: {
    name: '骨窗',
    center: 500,
    width: 2000,
    colorPoints: [
      [-200, 0.0, 0.0, 0.0],
      [0, 0.1, 0.1, 0.12],
      [200, 0.3, 0.25, 0.2],
      [400, 0.6, 0.55, 0.5],
      [600, 0.85, 0.8, 0.75],
      [800, 0.95, 0.92, 0.88],
      [1000, 1.0, 1.0, 1.0],
      [1500, 1.0, 0.98, 0.95],
    ],
    opacityPoints: [
      [-200, 0.0],
      [0, 0.0],
      [200, 0.02],
      [400, 0.15],
      [600, 0.5],
      [800, 0.85],
      [1000, 1.0],
      [1500, 1.0],
    ],
  },
}

async function loadVTK() {
  const vtkGenericRenderWindow = await import('@kitware/vtk.js/Rendering/Misc/GenericRenderWindow')
  const vtkVolume = await import('@kitware/vtk.js/Rendering/Core/Volume')
  const vtkVolumeMapper = await import('@kitware/vtk.js/Rendering/Core/VolumeMapper')
  const vtkImageData = await import('@kitware/vtk.js/Common/DataModel/ImageData')
  const vtkDataArray = await import('@kitware/vtk.js/Common/Core/DataArray')
  const vtkColorTransferFunction = await import('@kitware/vtk.js/Rendering/Core/ColorTransferFunction')
  const vtkPiecewiseFunction = await import('@kitware/vtk.js/Common/DataModel/PiecewiseFunction')
  const vtkInteractorStyleTrackballCamera = await import('@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera')

  return {
    vtkGenericRenderWindow: vtkGenericRenderWindow.default,
    vtkVolume: vtkVolume.default,
    vtkVolumeMapper: vtkVolumeMapper.default,
    vtkImageData: vtkImageData.default,
    vtkDataArray: vtkDataArray.default,
    vtkColorTransferFunction: vtkColorTransferFunction.default,
    vtkPiecewiseFunction: vtkPiecewiseFunction.default,
    vtkInteractorStyleTrackballCamera: vtkInteractorStyleTrackballCamera.default,
  }
}

export function useVTKVolumeRenderer(containerRef: Ref<HTMLElement | null>) {
  const vtk = ref<any>(null)
  const genericRenderWindow = ref<any>(null)
  const renderWindow = ref<any>(null)
  const renderer = ref<any>(null)
  const volume = ref<any>(null)
  const mapper = ref<any>(null)
  const imageData = ref<any>(null)
  const colorFun = ref<any>(null)
  const opacityFun = ref<any>(null)
  const isReady = ref(false)
  const fps = ref(0)
  const isLoading = ref(false)
  const loadingProgress = ref(0)
  const currentPreset = ref<string>('lung')

  let animationFrameId: number | null = null
  let lastTime = performance.now()
  let frameCount = 0
  let isDisposed = false

  const init = async () => {
    if (!containerRef.value || isDisposed) return

    try {
      vtk.value = await loadVTK()

      genericRenderWindow.value = vtk.value.vtkGenericRenderWindow.newInstance({
        background: [0.05, 0.05, 0.05],
      })
      genericRenderWindow.value.setContainer(containerRef.value)
      genericRenderWindow.value.resize()

      renderWindow.value = genericRenderWindow.value.getRenderWindow()
      renderer.value = genericRenderWindow.value.getRenderer()

      const interactor = genericRenderWindow.value.getInteractor()
      const style = vtk.value.vtkInteractorStyleTrackballCamera.newInstance()
      interactor.setInteractorStyle(style)

      mapper.value = vtk.value.vtkVolumeMapper.newInstance()
      mapper.value.setSampleDistance(0.5)
      mapper.value.setAutoAdjustSampleDistances(true)

      volume.value = vtk.value.vtkVolume.newInstance()
      volume.value.setMapper(mapper.value)

      colorFun.value = vtk.value.vtkColorTransferFunction.newInstance()
      opacityFun.value = vtk.value.vtkPiecewiseFunction.newInstance()

      volume.value.getProperty().setRGBTransferFunction(0, colorFun.value)
      volume.value.getProperty().setScalarOpacity(0, opacityFun.value)
      volume.value.getProperty().setScalarOpacityUnitDistance(0, 1.5)
      volume.value.getProperty().setInterpolationTypeToLinear()
      volume.value.getProperty().setShade(true)
      volume.value.getProperty().setAmbient(0.2)
      volume.value.getProperty().setDiffuse(0.7)
      volume.value.getProperty().setSpecular(0.3)
      volume.value.getProperty().setSpecularPower(10)

      renderer.value.addVolume(volume.value)
      renderer.value.resetCamera()

      startFPSMonitor()

      isReady.value = true
      console.log('VTK Volume Renderer initialized')
    } catch (error) {
      console.error('Failed to initialize VTK:', error)
    }
  }

  const clearImageData = () => {
    if (imageData.value) {
      const scalars = imageData.value.getPointData().getScalars()
      if (scalars) {
        scalars.delete()
      }
      imageData.value.delete()
      imageData.value = null
    }
  }

  const loadDICOMData = async (scalars: Float32Array, dimensions: [number, number, number], spacing: [number, number, number]) => {
    if (!vtk.value || !volume.value || isDisposed) return

    isLoading.value = true
    loadingProgress.value = 0

    try {
      clearImageData()

      imageData.value = vtk.value.vtkImageData.newInstance()
      imageData.value.setDimensions(dimensions)
      imageData.value.setSpacing(spacing)

      const dataArray = vtk.value.vtkDataArray.newInstance({
        name: 'CT',
        numberOfComponents: 1,
        values: scalars,
      })

      imageData.value.getPointData().setScalars(dataArray)

      mapper.value.setInputData(imageData.value)
      
      applyWindowPreset('lung')

      if (renderer.value && !isDisposed) {
        renderer.value.resetCamera()
      }
      
      if (renderWindow.value && !isDisposed) {
        renderWindow.value.render()
      }

      loadingProgress.value = 100
      console.log('DICOM data loaded:', { dimensions, spacing })
    } catch (error) {
      console.error('Failed to load DICOM data:', error)
    } finally {
      isLoading.value = false
    }
  }

  const applyWindowPreset = (presetName: string) => {
    if (!vtk.value || !volume.value || isDisposed) return

    const preset = WINDOW_PRESETS[presetName]
    if (!preset) return

    currentPreset.value = presetName

    colorFun.value.removeAllPoints()
    opacityFun.value.removeAllPoints()

    preset.colorPoints.forEach(([hu, r, g, b]) => {
      colorFun.value.addRGBPoint(hu, r, g, b)
    })

    preset.opacityPoints.forEach(([hu, opacity]) => {
      opacityFun.value.addPoint(hu, opacity)
    })

    if (renderWindow.value && !isDisposed) {
      renderWindow.value.render()
    }
  }

  const setWindowLevel = (center: number, width: number) => {
    if (!vtk.value || !volume.value || isDisposed) return

    const min = center - width / 2
    const max = center + width / 2

    colorFun.value.removeAllPoints()
    opacityFun.value.removeAllPoints()

    colorFun.value.addRGBPoint(min, 0, 0, 0)
    colorFun.value.addRGBPoint(center - width * 0.25, 0.25, 0.25, 0.25)
    colorFun.value.addRGBPoint(center, 0.5, 0.5, 0.5)
    colorFun.value.addRGBPoint(center + width * 0.25, 0.75, 0.75, 0.75)
    colorFun.value.addRGBPoint(max, 1, 1, 1)

    opacityFun.value.addPoint(min, 0)
    opacityFun.value.addPoint(center - width * 0.25, 0.2)
    opacityFun.value.addPoint(center, 0.5)
    opacityFun.value.addPoint(center + width * 0.25, 0.8)
    opacityFun.value.addPoint(max, 1)

    if (renderWindow.value && !isDisposed) {
      renderWindow.value.render()
    }
  }

  const startFPSMonitor = () => {
    if (isDisposed) return
    
    const monitor = () => {
      if (isDisposed) return
      
      const now = performance.now()
      frameCount++

      if (now - lastTime >= 1000) {
        fps.value = Math.round((frameCount * 1000) / (now - lastTime))
        frameCount = 0
        lastTime = now
      }

      animationFrameId = requestAnimationFrame(monitor)
    }
    monitor()
  }

  const resize = () => {
    if (genericRenderWindow.value && !isDisposed) {
      genericRenderWindow.value.resize()
      if (renderWindow.value && !isDisposed) {
        renderWindow.value.render()
      }
    }
  }

  const dispose = () => {
    if (isDisposed) return
    isDisposed = true

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    clearImageData()

    if (mapper.value) {
      mapper.value.setInputData(null)
      mapper.value.delete()
      mapper.value = null
    }

    if (volume.value) {
      volume.value.setMapper(null)
      volume.value.delete()
      volume.value = null
    }

    if (colorFun.value) {
      colorFun.value.delete()
      colorFun.value = null
    }

    if (opacityFun.value) {
      opacityFun.value.delete()
      opacityFun.value = null
    }

    if (genericRenderWindow.value) {
      genericRenderWindow.value.setContainer(null)
      genericRenderWindow.value.delete()
      genericRenderWindow.value = null
    }

    renderWindow.value = null
    renderer.value = null
    vtk.value = null
    isReady.value = false

    console.log('VTK Volume Renderer disposed')
  }

  onMounted(init)
  onUnmounted(dispose)

  return {
    isReady,
    fps,
    isLoading,
    loadingProgress,
    currentPreset,
    loadDICOMData,
    applyWindowPreset,
    setWindowLevel,
    resize,
    dispose,
  }
}
