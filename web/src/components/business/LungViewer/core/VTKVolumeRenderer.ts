// @ts-nocheck
import '@kitware/vtk.js/Rendering/Profiles/Volume';
import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';

export interface WindowLevel {
  windowCenter: number
  windowWidth: number
}

export const CT_WINDOWS = {
  lung: { windowCenter: -600, windowWidth: 1500 },
  mediastinal: { windowCenter: 40, windowWidth: 400 },
  bone: { windowCenter: 500, windowWidth: 2000 }
}

export class VTKVolumeRenderer {
  private genericRenderWindow: any = null
  private renderer: any = null
  private renderWindow: any = null
  private isInitialized = false

  private imageMapper: any = null
  private imageSlice: any = null
  private volumeMapper: any = null
  private volume: any = null
  private colorFunction: any = null
  private opacityFunction: any = null

  private is3DMode = false
  private container: HTMLElement | null = null

  constructor(container: HTMLElement) {
    this.container = container
    this.initRenderer(container)
  }

  private initRenderer(container: HTMLElement) {
    try {
      this.genericRenderWindow = vtkGenericRenderWindow.newInstance({
        background: [0.04, 0.04, 0.04]
      })
      
      this.genericRenderWindow.setContainer(container)
      
      const width = container.clientWidth || 600
      const height = container.clientHeight || 500
      this.genericRenderWindow.resize()
      
      this.renderer = this.genericRenderWindow.getRenderer()
      this.renderWindow = this.genericRenderWindow.getRenderWindow()
      
      this.isInitialized = true
      console.log('VTK Renderer initialized, container size:', width, 'x', height)
    } catch (error) {
      console.error('Failed to initialize VTK renderer:', error)
      throw error
    }
  }

  public setInputData(imageData: any, is3D: boolean = false) {
    if (!this.isInitialized) {
      console.error('Renderer not initialized')
      return
    }

    this.is3DMode = is3D
    console.log('Setting image data, is3D:', is3D, 'Dimensions:', imageData.getDimensions())

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

  private forceRender() {
    if (!this.container || !this.isInitialized) {
      console.error('Cannot render: container or renderer not initialized')
      return
    }

    const width = this.container.clientWidth || 600
    const height = this.container.clientHeight || 500

    console.log('Forcing render with size:', width, 'x', height)

    if (width === 0 || height === 0) {
      console.warn('Container has 0 size, waiting...')
      requestAnimationFrame(() => this.forceRender())
      return
    }

    this.genericRenderWindow.resize()
    this.renderWindow.render()

    console.log('Render forced successfully')
  }

  private clearActors() {
    if (this.imageSlice) {
      this.renderer.removeViewProp(this.imageSlice)
      this.imageSlice = null
      this.imageMapper = null
    }
    if (this.volume) {
      this.renderer.removeViewProp(this.volume)
      this.volume = null
      this.volumeMapper = null
    }
  }

  private init2DRendering(imageData: any) {
    this.imageMapper = vtkImageMapper.newInstance()
    this.imageMapper.setInputData(imageData)
    this.imageSlice = vtkImageSlice.newInstance()
    this.colorFunction = vtkColorTransferFunction.newInstance()

    this.imageSlice.setMapper(this.imageMapper)

    const property = this.imageSlice.getProperty()
    property.setRGBTransferFunction(this.colorFunction)
    property.setInterpolationTypeToLinear()

    const dimensions = imageData.getDimensions()
    console.log('Image dimensions:', dimensions)

    this.imageMapper.setZSlice(Math.floor(dimensions[2] / 2))

    this.renderer.addActor(this.imageSlice)

    const scalars = imageData.getPointData().getScalars()
    const scalarRange = scalars.getRange()
    console.log('Scalar range:', scalarRange)

    this.colorFunction.removeAllPoints()
    
    const rawData = scalars.getData()
    const sortedData = Array.from(rawData).sort((a, b) => a - b)
    const p2Index = Math.floor(sortedData.length * 0.02)
    const p98Index = Math.floor(sortedData.length * 0.98)
    const p2 = sortedData[p2Index]
    const p98 = sortedData[p98Index]
    
    console.log('Auto-adjusted display range (2nd-98th percentile):', p2.toFixed(0), 'to', p98.toFixed(0))
    
    this.colorFunction.addRGBPoint(p2, 0, 0, 0)
    this.colorFunction.addRGBPoint(p2 + (p98 - p2) * 0.25, 0.25, 0.25, 0.25)
    this.colorFunction.addRGBPoint(p2 + (p98 - p2) * 0.5, 0.5, 0.5, 0.5)
    this.colorFunction.addRGBPoint(p2 + (p98 - p2) * 0.75, 0.75, 0.75, 0.75)
    this.colorFunction.addRGBPoint(p98, 1, 1, 1)

    const camera = this.renderer.getActiveCamera()
    camera.setParallelProjection(true)
    this.renderer.resetCamera()

    console.log('2D rendering initialized')
  }

  private init3DRendering(imageData: any) {
    this.volumeMapper = vtkVolumeMapper.newInstance()
    this.volumeMapper.setSampleDistance(0.5)
    this.volumeMapper.setInputData(imageData)

    this.volume = vtkVolume.newInstance()
    this.colorFunction = vtkColorTransferFunction.newInstance()
    this.opacityFunction = vtkPiecewiseFunction.newInstance()

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

    this.renderer.addVolume(this.volume)

    const camera = this.renderer.getActiveCamera()
    camera.setParallelProjection(false)

    this.renderer.resetCamera()

    const scalarRange = imageData.getPointData().getScalars().getRange()
    console.log('3D rendering initialized, scalar range:', scalarRange)

    this.setWindowPreset('lung')
  }

  public setWindowLevel(windowCenter: number, windowWidth: number) {
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

  public setWindowPreset(preset: 'lung' | 'mediastinal' | 'bone') {
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

  public render() {
    if (!this.isInitialized) return
    this.forceRender()
  }

  public resize(width: number, height: number) {
    if (!this.isInitialized) return
    this.genericRenderWindow.resize()
    this.forceRender()
  }

  public dispose() {
    if (!this.isInitialized) return
    
    this.clearActors()
    
    if (this.genericRenderWindow) {
      this.genericRenderWindow.setContainer(null)
      this.genericRenderWindow.delete()
    }
    
    this.isInitialized = false
  }

  public startInteraction() {
    if (!this.isInitialized) return
    const interactor = this.renderWindow.getInteractor()
    if (interactor) {
      interactor.start()
    }
  }
}
