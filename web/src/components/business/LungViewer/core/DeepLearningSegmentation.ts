import type {
  Point3D,
  LungBounds,
  SegmentedLungs,
  SegmentationConfig,
  MeshData
} from '../types/segmentation'
import { DEFAULT_SEGMENTATION_CONFIG } from '../types/segmentation'
import { onnxEngine } from './ONNXEngine'
import { segmentationModelManager } from './SegmentationModelManager'
import type { PerformanceConfig } from '../config/performance'
import createLogger from '@/utils/logger'

const log = createLogger('DeepLearningSegmentation')

const MODEL_INPUT_SIZE = 512

export class DeepLearningSegmentation {
  private volumeData: Float32Array | null = null
  private shape: [number, number, number] = [0, 0, 0]
  private config: SegmentationConfig
  private performanceConfig: Partial<PerformanceConfig> | null = null
  private isModelReady = false
  private loadProgress = 0

  constructor(config?: Partial<SegmentationConfig>, performanceConfig?: Partial<PerformanceConfig>) {
    this.config = { ...DEFAULT_SEGMENTATION_CONFIG, ...config }
    this.performanceConfig = performanceConfig || null
  }

  async initialize(onProgress?: (progress: number) => void): Promise<boolean> {
    if (this.isModelReady) {
      return true
    }

    try {
      log.info('Initializing deep learning segmentation')

      if (this.performanceConfig) {
        segmentationModelManager.setPerformanceConfig(this.performanceConfig)
      }

      const success = await segmentationModelManager.loadModel((progress) => {
        this.loadProgress = progress
        onProgress?.(progress)
      })

      if (success) {
        this.isModelReady = true
        log.info('Deep learning segmentation initialized', {
          provider: onnxEngine.getExecutionProvider()
        })
      }

      return success
    } catch (error) {
      log.error('Failed to initialize deep learning segmentation', { error })
      return false
    }
  }

  getLoadProgress(): number {
    return this.loadProgress
  }

  isReady(): boolean {
    return this.isModelReady
  }

  public setVolume(volumeData: Float32Array, shape: [number, number, number]): void {
    this.volumeData = volumeData
    this.shape = shape
  }

  public async segment(): Promise<SegmentedLungs> {
    if (!this.volumeData) {
      throw new Error('Volume data not set')
    }

    if (!this.isModelReady) {
      log.warn('Model not ready, falling back to threshold segmentation')
      return this.fallbackSegmentation()
    }

    const startTime = performance.now()
    log.info('Starting deep learning segmentation', { shape: this.shape })

    const sliceMasks: Uint8Array[] = []

    for (let z = 0; z < this.shape[2]; z++) {
      const slice = this.extractSlice(z)
      const preprocessed = this.preprocessSlice(slice)
      const mask = await this.inferenceSlice(preprocessed)
      const resizedMask = this.resizeMask(mask, this.shape[0], this.shape[1])
      sliceMasks.push(resizedMask)
    }

    const fullMask = this.combineSliceMasks(sliceMasks)
    const { leftMask, rightMask } = this.separateLeftAndRightLungs(fullMask)

    const leftBounds = this.computeBounds(leftMask)
    const rightBounds = this.computeBounds(rightMask)
    const fullBounds = this.computeBounds(fullMask)

    const totalTime = performance.now() - startTime
    log.info('Deep learning segmentation completed', { 
      time: totalTime.toFixed(2) + 'ms',
      slices: this.shape[2]
    })

    return {
      leftLungMask: leftMask,
      rightLungMask: rightMask,
      fullLungMask: fullMask,
      leftLungBounds: leftBounds,
      rightLungBounds: rightBounds,
      fullLungBounds: fullBounds
    }
  }

  private extractSlice(z: number): Float32Array {
    const sliceSize = this.shape[0] * this.shape[1]
    const slice = new Float32Array(sliceSize)
    const offset = z * sliceSize

    for (let i = 0; i < sliceSize; i++) {
      slice[i] = this.volumeData![offset + i]
    }

    return slice
  }

  private preprocessSlice(slice: Float32Array): Float32Array {
    const preprocessed = new Float32Array(MODEL_INPUT_SIZE * MODEL_INPUT_SIZE)

    let minVal = Infinity
    let maxVal = -Infinity
    for (let i = 0; i < slice.length; i++) {
      if (slice[i] < minVal) minVal = slice[i]
      if (slice[i] > maxVal) maxVal = slice[i]
    }

    const range = maxVal - minVal || 1

    const scaleX = this.shape[0] / MODEL_INPUT_SIZE
    const scaleY = this.shape[1] / MODEL_INPUT_SIZE

    for (let y = 0; y < MODEL_INPUT_SIZE; y++) {
      for (let x = 0; x < MODEL_INPUT_SIZE; x++) {
        const srcX = Math.floor(x * scaleX)
        const srcY = Math.floor(y * scaleY)
        const srcIdx = srcY * this.shape[0] + srcX
        
        const normalized = (slice[srcIdx] - minVal) / range
        preprocessed[y * MODEL_INPUT_SIZE + x] = normalized
      }
    }

    return preprocessed
  }

  private async inferenceSlice(input: Float32Array): Promise<Uint8Array> {
    const result = await onnxEngine.runInference(input)
    
    if (!result) {
      return new Uint8Array(MODEL_INPUT_SIZE * MODEL_INPUT_SIZE)
    }

    const mask = new Uint8Array(MODEL_INPUT_SIZE * MODEL_INPUT_SIZE)
    const threshold = 0.5

    for (let i = 0; i < result.output.length; i++) {
      mask[i] = result.output[i] > threshold ? 1 : 0
    }

    return mask
  }

  private resizeMask(mask: Uint8Array, targetWidth: number, targetHeight: number): Uint8Array {
    const resized = new Uint8Array(targetWidth * targetHeight)

    const scaleX = MODEL_INPUT_SIZE / targetWidth
    const scaleY = MODEL_INPUT_SIZE / targetHeight

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const srcX = Math.floor(x * scaleX)
        const srcY = Math.floor(y * scaleY)
        const srcIdx = srcY * MODEL_INPUT_SIZE + srcX
        
        resized[y * targetWidth + x] = mask[srcIdx]
      }
    }

    return resized
  }

  private combineSliceMasks(sliceMasks: Uint8Array[]): Uint8Array {
    const totalSize = sliceMasks.length * this.shape[0] * this.shape[1]
    const fullMask = new Uint8Array(totalSize)

    for (let z = 0; z < sliceMasks.length; z++) {
      const offset = z * this.shape[0] * this.shape[1]
      fullMask.set(sliceMasks[z], offset)
    }

    return fullMask
  }

  private separateLeftAndRightLungs(mask: Uint8Array): { leftMask: Uint8Array; rightMask: Uint8Array } {
    const visited = new Uint8Array(mask.length)
    const leftMask = new Uint8Array(mask.length)
    const rightMask = new Uint8Array(mask.length)

    const regions: { points: Point3D[]; size: number }[] = []

    for (let z = 0; z < this.shape[2]; z++) {
      for (let y = 0; y < this.shape[1]; y++) {
        for (let x = 0; x < this.shape[0]; x++) {
          const idx = this.getIndex(x, y, z)
          if (mask[idx] === 1 && visited[idx] === 0) {
            const region = this.floodFill(mask, visited, x, y, z)
            if (region.length > this.config.minLungVolume) {
              regions.push({ points: region, size: region.length })
            }
          }
        }
      }
    }

    regions.sort((a, b) => b.size - a.size)

    for (let i = 0; i < Math.min(2, regions.length); i++) {
      const region = regions[i]
      const centerX = region.points.reduce((sum, p) => sum + p.x, 0) / region.points.length

      if (centerX < this.shape[0] / 2) {
        for (const p of region.points) {
          leftMask[p.index] = 1
        }
      } else {
        for (const p of region.points) {
          rightMask[p.index] = 1
        }
      }
    }

    return { leftMask, rightMask }
  }

  private floodFill(mask: Uint8Array, visited: Uint8Array, startX: number, startY: number, startZ: number): Point3D[] {
    const points: Point3D[] = []
    const queue: Point3D[] = []
    const startIdx = this.getIndex(startX, startY, startZ)

    queue.push({ x: startX, y: startY, z: startZ, index: startIdx })
    visited[startIdx] = 1

    while (queue.length > 0) {
      const current = queue.shift()!
      points.push(current)

      const neighbors = [
        { x: current.x - 1, y: current.y, z: current.z },
        { x: current.x + 1, y: current.y, z: current.z },
        { x: current.x, y: current.y - 1, z: current.z },
        { x: current.x, y: current.y + 1, z: current.z },
        { x: current.x, y: current.y, z: current.z - 1 },
        { x: current.x, y: current.y, z: current.z + 1 }
      ]

      for (const neighbor of neighbors) {
        if (this.isInBounds(neighbor.x, neighbor.y, neighbor.z)) {
          const nIdx = this.getIndex(neighbor.x, neighbor.y, neighbor.z)
          if (mask[nIdx] === 1 && visited[nIdx] === 0) {
            visited[nIdx] = 1
            queue.push({ x: neighbor.x, y: neighbor.y, z: neighbor.z, index: nIdx })
          }
        }
      }
    }

    return points
  }

  private fallbackSegmentation(): SegmentedLungs {
    const mask = new Uint8Array(this.volumeData!.length)
    const { lungMinThreshold, lungMaxThreshold } = this.config

    for (let i = 0; i < this.volumeData!.length; i++) {
      const value = this.volumeData![i]
      if (value >= lungMinThreshold && value <= lungMaxThreshold) {
        mask[i] = 1
      }
    }

    const { leftMask, rightMask } = this.separateLeftAndRightLungs(mask)
    const fullMask = new Uint8Array(mask.length)
    for (let i = 0; i < fullMask.length; i++) {
      fullMask[i] = leftMask[i] || rightMask[i]
    }

    return {
      leftLungMask: leftMask,
      rightLungMask: rightMask,
      fullLungMask: fullMask,
      leftLungBounds: this.computeBounds(leftMask),
      rightLungBounds: this.computeBounds(rightMask),
      fullLungBounds: this.computeBounds(fullMask)
    }
  }

  private computeBounds(mask: Uint8Array): LungBounds {
    let minX = this.shape[0], maxX = 0
    let minY = this.shape[1], maxY = 0
    let minZ = this.shape[2], maxZ = 0

    for (let i = 0; i < mask.length; i++) {
      if (mask[i] === 1) {
        const x = i % this.shape[0]
        const y = Math.floor(i / this.shape[0]) % this.shape[1]
        const z = Math.floor(i / (this.shape[0] * this.shape[1]))

        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
        minZ = Math.min(minZ, z)
        maxZ = Math.max(maxZ, z)
      }
    }

    return {
      min: { x: minX, y: minY, z: minZ, index: 0 },
      max: { x: maxX, y: maxY, z: maxZ, index: 0 },
      center: {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        z: (minZ + maxZ) / 2,
        index: 0
      }
    }
  }

  private getIndex(x: number, y: number, z: number): number {
    return z * this.shape[0] * this.shape[1] + y * this.shape[0] + x
  }

  private isInBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && x < this.shape[0] && y >= 0 && y < this.shape[1] && z >= 0 && z < this.shape[2]
  }

  public generateMeshData(mask: Uint8Array): MeshData {
    const vertices: number[] = []
    const normals: number[] = []
    const indices: number[] = []

    const visited = new Set<string>()

    for (let z = 0; z < this.shape[2] - 1; z++) {
      for (let y = 0; y < this.shape[1] - 1; y++) {
        for (let x = 0; x < this.shape[0] - 1; x++) {
          const idx = this.getIndex(x, y, z)
          if (mask[idx] === 1) {
            const key = `${x},${y},${z}`
            if (!visited.has(key)) {
              visited.add(key)
              this.addCubeForPoint(vertices, normals, indices, x, y, z)
            }
          }
        }
      }
    }

    return {
      positions: new Float32Array(vertices),
      normals: new Float32Array(normals),
      indices: new Uint16Array(indices),
      bounds: this.computeBounds(mask)
    }
  }

  private addCubeForPoint(vertices: number[], normals: number[], indices: number[], x: number, y: number, z: number): void {
    const baseIdx = vertices.length / 3
    const cubeSize = 0.5

    const corners = [
      [x - cubeSize, y - cubeSize, z - cubeSize],
      [x + cubeSize, y - cubeSize, z - cubeSize],
      [x + cubeSize, y + cubeSize, z - cubeSize],
      [x - cubeSize, y + cubeSize, z - cubeSize],
      [x - cubeSize, y - cubeSize, z + cubeSize],
      [x + cubeSize, y - cubeSize, z + cubeSize],
      [x + cubeSize, y + cubeSize, z + cubeSize],
      [x - cubeSize, y + cubeSize, z + cubeSize]
    ]

    for (const corner of corners) {
      vertices.push(...corner)
      normals.push(0, 0, 1)
    }

    const cubeFaces = [
      [0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7],
      [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]
    ]

    for (const face of cubeFaces) {
      indices.push(
        baseIdx + face[0], baseIdx + face[1], baseIdx + face[2],
        baseIdx + face[0], baseIdx + face[2], baseIdx + face[3]
      )
    }
  }

  async dispose(): Promise<void> {
    await segmentationModelManager.dispose()
    this.isModelReady = false
  }
}

export function createDeepLearningSegmentation(
  config?: Partial<SegmentationConfig>,
  performanceConfig?: Partial<PerformanceConfig>
): DeepLearningSegmentation {
  return new DeepLearningSegmentation(config, performanceConfig)
}
