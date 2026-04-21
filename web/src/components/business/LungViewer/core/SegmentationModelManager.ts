import createLogger from '@/utils/logger'
import { onnxEngine, type ModelConfig } from './ONNXEngine'
import type { PerformanceConfig } from '../config/performance'

const log = createLogger('SegmentationModel')

export interface ModelInfo {
  name: string
  version: string
  url: string
  size: number
  inputShape: [number, number, number, number]
  outputShape: [number, number, number, number]
  labels: string[]
  description: string
}

const LUNG_SEGMENTATION_MODEL: ModelInfo = {
  name: 'lung-unet-resnet34',
  version: '1.0.0',
  url: '/models/lung_segmentation.onnx',
  size: 45 * 1024 * 1024,
  inputShape: [1, 1, 512, 512],
  outputShape: [1, 1, 512, 512],
  labels: ['background', 'left_lung', 'right_lung'],
  description: 'U-Net with ResNet34 encoder for lung segmentation from CT scans',
}

const MODEL_CONFIG: ModelConfig = {
  inputName: 'input',
  outputName: 'output',
  inputShape: LUNG_SEGMENTATION_MODEL.inputShape,
  outputShape: LUNG_SEGMENTATION_MODEL.outputShape,
}

const CACHE_DB_NAME = 'lung-segmentation-models'
const CACHE_STORE_NAME = 'models'
const CACHE_VERSION = 1

export class SegmentationModelManager {
  private db: IDBDatabase | null = null
  private isModelLoaded = false
  private loadProgress = 0
  private performanceConfig: Partial<PerformanceConfig> | null = null

  setPerformanceConfig(config: Partial<PerformanceConfig>): void {
    this.performanceConfig = config
  }

  async initialize(): Promise<boolean> {
    try {
      await this.openCache()
      
      const cached = await this.isModelCached()
      if (!cached) {
        log.info('Model not cached, will download on first use')
      }

      return true
    } catch (error) {
      log.error('Failed to initialize model manager', { error })
      return false
    }
  }

  private openCache(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CACHE_DB_NAME, CACHE_VERSION)

      request.onerror = () => {
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
          db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'name' })
        }
      }
    })
  }

  async isModelCached(): Promise<boolean> {
    if (!this.db) return false

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(CACHE_STORE_NAME, 'readonly')
      const store = transaction.objectStore(CACHE_STORE_NAME)
      const request = store.get(LUNG_SEGMENTATION_MODEL.name)

      request.onsuccess = () => {
        resolve(!!request.result)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  async downloadModel(onProgress?: (progress: number) => void): Promise<ArrayBuffer | null> {
    try {
      log.info('Downloading model', { url: LUNG_SEGMENTATION_MODEL.url })

      const response = await fetch(LUNG_SEGMENTATION_MODEL.url)
      if (!response.ok) {
        throw new Error(`Failed to download model: ${response.status}`)
      }

      const contentLength = response.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : LUNG_SEGMENTATION_MODEL.size

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Response body is not readable')
      }

      const chunks: Uint8Array[] = []
      let loaded = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        chunks.push(value)
        loaded += value.length
        
        const progress = (loaded / total) * 100
        this.loadProgress = progress
        onProgress?.(progress)
      }

      const modelData = new Uint8Array(loaded)
      let offset = 0
      for (const chunk of chunks) {
        modelData.set(chunk, offset)
        offset += chunk.length
      }

      log.info('Model downloaded', { size: loaded })
      return modelData.buffer
    } catch (error) {
      log.error('Failed to download model', { error })
      return null
    }
  }

  async cacheModel(modelData: ArrayBuffer): Promise<boolean> {
    if (!this.db) return false

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(CACHE_STORE_NAME, 'readwrite')
      const store = transaction.objectStore(CACHE_STORE_NAME)

      const request = store.put({
        name: LUNG_SEGMENTATION_MODEL.name,
        version: LUNG_SEGMENTATION_MODEL.version,
        data: modelData,
        timestamp: Date.now(),
      })

      request.onsuccess = () => {
        log.info('Model cached successfully')
        resolve(true)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  async getCachedModel(): Promise<ArrayBuffer | null> {
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(CACHE_STORE_NAME, 'readonly')
      const store = transaction.objectStore(CACHE_STORE_NAME)
      const request = store.get(LUNG_SEGMENTATION_MODEL.name)

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.data)
        } else {
          resolve(null)
        }
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  async loadModel(onProgress?: (progress: number) => void): Promise<boolean> {
    if (this.isModelLoaded) {
      return true
    }

    try {
      let modelData = await this.getCachedModel()

      if (!modelData) {
        modelData = await this.downloadModel(onProgress)
        if (!modelData) {
          return false
        }
        await this.cacheModel(modelData)
      } else {
        onProgress?.(100)
      }

      const success = await onnxEngine.initialize(new Uint8Array(modelData), MODEL_CONFIG, this.performanceConfig || undefined)

      if (success) {
        this.isModelLoaded = true
        log.info('Model loaded successfully', {
          provider: onnxEngine.getExecutionProvider(),
        })
      }

      return success
    } catch (error) {
      log.error('Failed to load model', { error })
      return false
    }
  }

  getLoadProgress(): number {
    return this.loadProgress
  }

  isLoaded(): boolean {
    return this.isModelLoaded
  }

  getModelInfo(): ModelInfo {
    return LUNG_SEGMENTATION_MODEL
  }

  async dispose(): Promise<void> {
    await onnxEngine.dispose()
    this.isModelLoaded = false
  }
}

export const segmentationModelManager = new SegmentationModelManager()
