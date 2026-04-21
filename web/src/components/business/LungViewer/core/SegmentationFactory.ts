import type { SegmentedLungs, SegmentationConfig, MeshData } from '../types/segmentation'
import { LungSegmentation } from './LungSegmentation'
import { DeepLearningSegmentation } from './DeepLearningSegmentation'
import type { PerformanceConfig } from '../config/performance'
import createLogger from '@/utils/logger'

const log = createLogger('SegmentationFactory')

export type SegmentationMethod = 'deep_learning' | 'threshold' | 'auto'

export interface SegmentationOptions {
  method: SegmentationMethod
  config?: Partial<SegmentationConfig>
  performanceConfig?: Partial<PerformanceConfig>
  onProgress?: (progress: number, stage: string) => void
}

export interface SegmentationCapabilities {
  deepLearning: boolean
  webGPU: boolean
  webAssembly: boolean
}

export class SegmentationFactory {
  private deepLearningSegmentation: DeepLearningSegmentation | null = null
  private thresholdSegmentation: LungSegmentation | null = null
  private capabilities: SegmentationCapabilities | null = null

  async checkCapabilities(): Promise<SegmentationCapabilities> {
    if (this.capabilities) {
      return this.capabilities
    }

    const webGPU = await this.checkWebGPUSupport()
    const webAssembly = typeof WebAssembly === 'object'

    this.capabilities = {
      deepLearning: webGPU || webAssembly,
      webGPU,
      webAssembly,
    }

    log.info('Segmentation capabilities', { 
      deepLearning: this.capabilities.deepLearning,
      webGPU: this.capabilities.webGPU,
      webAssembly: this.capabilities.webAssembly 
    })
    return this.capabilities
  }

  private async checkWebGPUSupport(): Promise<boolean> {
    if (!navigator.gpu) {
      return false
    }

    try {
      const adapter = await navigator.gpu.requestAdapter()
      return !!adapter
    } catch {
      return false
    }
  }

  async createSegmentation(
    options: SegmentationOptions
  ): Promise<{
    segment: (volumeData: Float32Array, shape: [number, number, number]) => Promise<SegmentedLungs>
    generateMeshData: (mask: Uint8Array) => MeshData
    isReady: () => boolean
    getMethod: () => string
  }> {
    const capabilities = await this.checkCapabilities()
    let method = options.method

    if (method === 'auto') {
      method = capabilities.deepLearning ? 'deep_learning' : 'threshold'
      log.info('Auto-selected segmentation method', { method })
    }

    if (method === 'deep_learning') {
      if (!capabilities.deepLearning) {
        log.warn('Deep learning not supported, falling back to threshold')
        method = 'threshold'
      } else {
        return this.createDeepLearningSegmentation(options)
      }
    }

    return this.createThresholdSegmentation(options)
  }

  private async createDeepLearningSegmentation(options: SegmentationOptions) {
    this.deepLearningSegmentation = new DeepLearningSegmentation(
      options.config,
      options.performanceConfig
    )

    options.onProgress?.(0, 'loading_model')

    const success = await this.deepLearningSegmentation.initialize((progress) => {
      options.onProgress?.(progress, 'loading_model')
    })

    if (!success) {
      log.warn('Failed to initialize deep learning, falling back to threshold')
      return this.createThresholdSegmentation(options)
    }

    options.onProgress?.(100, 'ready')

    return {
      segment: async (volumeData: Float32Array, shape: [number, number, number]) => {
        this.deepLearningSegmentation!.setVolume(volumeData, shape)
        return this.deepLearningSegmentation!.segment()
      },
      generateMeshData: (mask: Uint8Array) => this.deepLearningSegmentation!.generateMeshData(mask),
      isReady: () => this.deepLearningSegmentation?.isReady() ?? false,
      getMethod: () => 'deep_learning',
    }
  }

  private createThresholdSegmentation(options: SegmentationOptions) {
    this.thresholdSegmentation = new LungSegmentation(options.config)

    options.onProgress?.(100, 'ready')

    return {
      segment: async (volumeData: Float32Array, shape: [number, number, number]) => {
        this.thresholdSegmentation!.setVolume(volumeData, shape)
        return this.thresholdSegmentation!.segment()
      },
      generateMeshData: (mask: Uint8Array) => this.thresholdSegmentation!.generateMeshData(mask),
      isReady: () => true,
      getMethod: () => 'threshold',
    }
  }

  async dispose(): Promise<void> {
    if (this.deepLearningSegmentation) {
      await this.deepLearningSegmentation.dispose()
      this.deepLearningSegmentation = null
    }
    this.thresholdSegmentation = null
  }
}

export const segmentationFactory = new SegmentationFactory()

export async function segmentLungs(
  volumeData: Float32Array,
  shape: [number, number, number],
  options: SegmentationOptions = { method: 'auto' }
): Promise<SegmentedLungs> {
  const segmentation = await segmentationFactory.createSegmentation(options)
  return segmentation.segment(volumeData, shape)
}
