import '@kitware/vtk.js/Rendering/Profiles/Volume'
import '@kitware/vtk.js/Rendering/Profiles/Geometry'

import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow'
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper'
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume'
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper'
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice'
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction'
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction'
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData'

export interface WindowLevel {
  windowCenter: number
  windowWidth: number
}

export const CT_WINDOWS = {
  lung: { windowCenter: -600, windowWidth: 1500 },
  mediastinal: { windowCenter: 40, windowWidth: 400 },
  bone: { windowCenter: 500, windowWidth: 2000 }
}

interface VtkObject {
  delete(): void
}

interface VtkGenericRenderWindowObj extends VtkObject {
  setContainer(container: HTMLElement | null): void
  resize(): void
  getRenderer(): VtkRendererObj
  getRenderWindow(): VtkRenderWindowObj
}

interface VtkRendererObj extends VtkObject {
  addActor(actor: unknown): void
  addVolume(volume: unknown): void
  removeViewProp(prop: unknown): void
  getActiveCamera(): { setParallelProjection(value: boolean): void }
  resetCamera(): void
}

interface VtkRenderWindowObj extends VtkObject {
  render(): void
  getInteractor(): { start(): void } | null
}

interface VtkImageMapperObj extends VtkObject {
  setInputData(data: unknown): void
  setZSlice(slice: number): void
}

interface VtkImageSliceObj extends VtkObject {
  setMapper(mapper: unknown): void
  getProperty(): { 
    setRGBTransferFunction(index: number, fn: unknown): void
    setInterpolationTypeToLinear(): void 
  }
}

interface VtkVolumeMapperObj extends VtkObject {
  setSampleDistance(distance: number): void
  setInputData(data: unknown): void
}

interface VtkVolumeObj extends VtkObject {
  setMapper(mapper: unknown): void
  getProperty(): {
    setRGBTransferFunction(idx: number, fn: unknown): void
    setScalarOpacity(idx: number, fn: unknown): void
    setScalarOpacityUnitDistance(idx: number, distance: number): void
    setInterpolationTypeToFastLinear(): void
    setShade(value: boolean): void
    setAmbient(value: number): void
    setDiffuse(value: number): void
    setSpecular(value: number): void
  }
}

interface VtkColorTransferFunctionObj extends VtkObject {
  removeAllPoints(): void
  addRGBPoint(x: number, r: number, g: number, b: number): void
}

interface VtkPiecewiseFunctionObj extends VtkObject {
  removeAllPoints(): void
  addPoint(x: number, y: number): void
}

export class VTKVolumeRenderer {
  private genericRenderWindow: VtkGenericRenderWindowObj | null = null
  private renderer: VtkRendererObj | null = null
  private renderWindow: VtkRenderWindowObj | null = null
  private isInitialized = false

  private imageMapper: VtkImageMapperObj | null = null
  private imageSlice: VtkImageSliceObj | null = null
  private volumeMapper: VtkVolumeMapperObj | null = null
  private volume: VtkVolumeObj | null = null
  private colorFunction: VtkColorTransferFunctionObj | null = null
  private opacityFunction: VtkPiecewiseFunctionObj | null = null

  private is3DMode = false
  private container: HTMLElement | null = null

  constructor(container: HTMLElement) {
    this.container = container
    this.initRenderer(container)
  }

  private initRenderer(container: HTMLElement): void {
    try {
      this.genericRenderWindow = vtkGenericRenderWindow.newInstance({
        background: [0.04, 0.04, 0.04]
      }) as VtkGenericRenderWindowObj
      
      this.genericRenderWindow.setContainer(container)
      this.genericRenderWindow.resize()
      
      this.renderer = this.genericRenderWindow.getRenderer()
      this.renderWindow = this.genericRenderWindow.getRenderWindow()
      
      this.isInitialized = true
    } catch (error) {
      throw error
    }
  }

  public setInputData(imageData: vtkImageData, is3D: boolean = false): void {
    if (!this.isInitialized) {
      return
    }

    this.is3DMode = is3D

    this.clearActors()

    if (is3D) {
      this.init3DRendering(imageData)
    } else {
      this.init2DRendering(imageData)
    }

    requestAnimationFrame(() => {
      this.forceRender()
    })
  }

  private forceRender(): void {
    if (!this.container || !this.isInitialized) {
      return
    }

    const width = this.container.clientWidth || 600
    const height = this.container.clientHeight || 500

    if (width === 0 || height === 0) {
      requestAnimationFrame(() => this.forceRender())
      return
    }

    this.genericRenderWindow?.resize()
    this.renderWindow?.render()
  }

  private clearActors(): void {
    if (this.imageSlice && this.renderer) {
      this.renderer.removeViewProp(this.imageSlice)
      this.imageSlice = null
      this.imageMapper = null
    }
    if (this.volume && this.renderer) {
      this.renderer.removeViewProp(this.volume)
      this.volume = null
      this.volumeMapper = null
    }
  }

  private init2DRendering(imageData: vtkImageData): void {
    this.imageMapper = vtkImageMapper.newInstance() as VtkImageMapperObj
    this.imageMapper.setInputData(imageData)
    this.imageSlice = vtkImageSlice.newInstance() as VtkImageSliceObj
    this.colorFunction = vtkColorTransferFunction.newInstance() as VtkColorTransferFunctionObj

    this.imageSlice.setMapper(this.imageMapper)

    const property = this.imageSlice.getProperty()
    property.setRGBTransferFunction(0, this.colorFunction)
    property.setInterpolationTypeToLinear()

    const dimensions = imageData.getDimensions()

    this.imageMapper.setZSlice(Math.floor(dimensions[2] / 2))

    this.renderer?.addActor(this.imageSlice)

    const scalars = imageData.getPointData().getScalars()

    this.colorFunction.removeAllPoints()
    
    const rawData = scalars.getData()
    const sortedData = Array.from(rawData).sort((a, b) => a - b)
    const p2Index = Math.floor(sortedData.length * 0.02)
    const p98Index = Math.floor(sortedData.length * 0.98)
    const p2 = sortedData[p2Index]
    const p98 = sortedData[p98Index]
    
    this.colorFunction.addRGBPoint(p2, 0, 0, 0)
    this.colorFunction.addRGBPoint(p2 + (p98 - p2) * 0.25, 0.25, 0.25, 0.25)
    this.colorFunction.addRGBPoint(p2 + (p98 - p2) * 0.5, 0.5, 0.5, 0.5)
    this.colorFunction.addRGBPoint(p2 + (p98 - p2) * 0.75, 0.75, 0.75, 0.75)
    this.colorFunction.addRGBPoint(p98, 1, 1, 1)

    const camera = this.renderer?.getActiveCamera()
    if (camera) {
      camera.setParallelProjection(true)
    }
    this.renderer?.resetCamera()
  }

  private init3DRendering(imageData: vtkImageData): void {
    this.volumeMapper = vtkVolumeMapper.newInstance() as VtkVolumeMapperObj
    this.volumeMapper.setSampleDistance(0.5)
    this.volumeMapper.setInputData(imageData)

    this.volume = vtkVolume.newInstance() as VtkVolumeObj
    this.colorFunction = vtkColorTransferFunction.newInstance() as VtkColorTransferFunctionObj
    this.opacityFunction = vtkPiecewiseFunction.newInstance() as VtkPiecewiseFunctionObj

    this.volume.setMapper(this.volumeMapper)

    const property = this.volume.getProperty()
    property.setRGBTransferFunction(0, this.colorFunction)
    property.setScalarOpacity(0, this.opacityFunction)
    property.setScalarOpacityUnitDistance(0, 2.5)
    property.setInterpolationTypeToFastLinear()
    property.setShade(true)
    property.setAmbient(0.1)
    property.setDiffuse(0.9)
    property.setSpecular(0.2)

    this.renderer?.addVolume(this.volume)

    const camera = this.renderer?.getActiveCamera()
    if (camera) {
      camera.setParallelProjection(false)
    }

    this.renderer?.resetCamera()

    this.setWindowPreset('lung')
  }

  public setWindowLevel(windowCenter: number, windowWidth: number): void {
    if (!this.isInitialized || !this.colorFunction) return

    this.colorFunction.removeAllPoints()

    const minHU = windowCenter - windowWidth / 2
    const maxHU = windowCenter + windowWidth / 2

    if (this.is3DMode && this.opacityFunction) {
      this.opacityFunction.removeAllPoints()

      this.colorFunction.addRGBPoint(-1024, 0, 0, 0)
      this.colorFunction.addRGBPoint(-1000, 0, 0, 0)
      this.colorFunction.addRGBPoint(minHU, 0, 0, 0)
      this.colorFunction.addRGBPoint(windowCenter - windowWidth * 0.1, 0.2, 0.2, 0.2)
      this.colorFunction.addRGBPoint(windowCenter, 0.5, 0.5, 0.5)
      this.colorFunction.addRGBPoint(windowCenter + windowWidth * 0.1, 0.8, 0.8, 0.8)
      this.colorFunction.addRGBPoint(maxHU, 1.0, 1.0, 1.0)
      this.colorFunction.addRGBPoint(2000, 1.0, 1.0, 1.0)

      this.opacityFunction.addPoint(-1024, 0)
      this.opacityFunction.addPoint(-1000, 0)
      this.opacityFunction.addPoint(minHU, 0)

      if (windowCenter < 0) {
        this.opacityFunction.addPoint(windowCenter - windowWidth * 0.2, 0.1)
        this.opacityFunction.addPoint(windowCenter - windowWidth * 0.1, 0.3)
        this.opacityFunction.addPoint(windowCenter, 0.5)
        this.opacityFunction.addPoint(windowCenter + windowWidth * 0.1, 0.7)
      } else {
        this.opacityFunction.addPoint(windowCenter - windowWidth * 0.3, 0.1)
        this.opacityFunction.addPoint(windowCenter - windowWidth * 0.1, 0.4)
        this.opacityFunction.addPoint(windowCenter, 0.6)
        this.opacityFunction.addPoint(windowCenter + windowWidth * 0.1, 0.8)
      }

      this.opacityFunction.addPoint(maxHU, 1.0)
      this.opacityFunction.addPoint(2000, 1.0)
    } else {
      this.colorFunction.removeAllPoints()
      this.colorFunction.addRGBPoint(minHU, 0, 0, 0)
      this.colorFunction.addRGBPoint(windowCenter - windowWidth * 0.25, 0.15, 0.15, 0.15)
      this.colorFunction.addRGBPoint(windowCenter, 0.5, 0.5, 0.5)
      this.colorFunction.addRGBPoint(windowCenter + windowWidth * 0.25, 0.85, 0.85, 0.85)
      this.colorFunction.addRGBPoint(maxHU, 1, 1, 1)
    }

    requestAnimationFrame(() => {
      this.forceRender()
    })
  }

  public setWindowPreset(preset: 'lung' | 'mediastinal' | 'bone'): void {
    const { windowCenter, windowWidth } = CT_WINDOWS[preset]
    
    if (!this.is3DMode) {
      this.setWindowLevel(windowCenter, windowWidth)
      return
    }

    if (!this.colorFunction || !this.opacityFunction) return

    this.colorFunction.removeAllPoints()
    this.opacityFunction.removeAllPoints()

    if (preset === 'lung') {
      this.colorFunction.addRGBPoint(-1000, 0.0, 0.0, 0.0)
      this.colorFunction.addRGBPoint(-900, 0.1, 0.1, 0.1)
      this.colorFunction.addRGBPoint(-700, 0.3, 0.3, 0.35)
      this.colorFunction.addRGBPoint(-500, 0.6, 0.6, 0.65)
      this.colorFunction.addRGBPoint(-300, 0.8, 0.75, 0.7)
      this.colorFunction.addRGBPoint(-100, 0.9, 0.5, 0.4)
      this.colorFunction.addRGBPoint(0, 1.0, 0.9, 0.8)
      this.colorFunction.addRGBPoint(100, 1.0, 1.0, 1.0)

      this.opacityFunction.addPoint(-1000, 0.0)
      this.opacityFunction.addPoint(-800, 0.0)
      this.opacityFunction.addPoint(-600, 0.15)
      this.opacityFunction.addPoint(-400, 0.3)
      this.opacityFunction.addPoint(-200, 0.6)
      this.opacityFunction.addPoint(0, 0.9)
      this.opacityFunction.addPoint(100, 1.0)
    } else if (preset === 'mediastinal') {
      this.colorFunction.addRGBPoint(-200, 0.0, 0.0, 0.0)
      this.colorFunction.addRGBPoint(-100, 0.2, 0.1, 0.1)
      this.colorFunction.addRGBPoint(0, 0.5, 0.3, 0.3)
      this.colorFunction.addRGBPoint(50, 0.8, 0.6, 0.5)
      this.colorFunction.addRGBPoint(100, 1.0, 0.9, 0.8)
      this.colorFunction.addRGBPoint(200, 1.0, 1.0, 1.0)

      this.opacityFunction.addPoint(-200, 0.0)
      this.opacityFunction.addPoint(-50, 0.1)
      this.opacityFunction.addPoint(20, 0.4)
      this.opacityFunction.addPoint(60, 0.7)
      this.opacityFunction.addPoint(150, 1.0)
    } else if (preset === 'bone') {
      this.colorFunction.addRGBPoint(-500, 0.0, 0.0, 0.0)
      this.colorFunction.addRGBPoint(0, 0.3, 0.3, 0.4)
      this.colorFunction.addRGBPoint(300, 0.7, 0.7, 0.8)
      this.colorFunction.addRGBPoint(800, 1.0, 1.0, 1.0)
      this.colorFunction.addRGBPoint(1500, 1.0, 1.0, 0.95)

      this.opacityFunction.addPoint(-500, 0.0)
      this.opacityFunction.addPoint(100, 0.0)
      this.opacityFunction.addPoint(400, 0.3)
      this.opacityFunction.addPoint(800, 0.8)
      this.opacityFunction.addPoint(1500, 1.0)
    }

    requestAnimationFrame(() => {
      this.forceRender()
    })
  }

  public render(): void {
    if (!this.isInitialized) return
    this.forceRender()
  }

  public resize(_width: number, _height: number): void {
    if (!this.isInitialized) return
    this.genericRenderWindow?.resize()
    this.forceRender()
  }

  public dispose(): void {
    if (!this.isInitialized) return
    
    this.clearActors()
    
    if (this.genericRenderWindow) {
      this.genericRenderWindow.setContainer(null)
      this.genericRenderWindow.delete()
    }
    
    this.isInitialized = false
  }

  public startInteraction(): void {
    if (!this.isInitialized) return
    const interactor = this.renderWindow?.getInteractor()
    if (interactor) {
      interactor.start()
    }
  }
}
