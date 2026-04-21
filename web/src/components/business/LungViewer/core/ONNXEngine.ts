import createLogger from '@/utils/logger'
import { 
  type PerformanceConfig, 
  DEFAULT_PERFORMANCE_CONFIG,
  getOptimalConfig 
} from '../config/performance'

const log = createLogger('ONNXEngine')

export interface ModelConfig {
  inputName: string
  outputName: string
  inputShape: [number, number, number, number]
  outputShape: [number, number, number, number]
}

export interface InferenceResult {
  output: Float32Array
  shape: number[]
  inferenceTime: number
}

export class ONNXEngine {
  private session: import('onnxruntime-web').InferenceSession | null = null
  private modelConfig: ModelConfig | null = null
  private isWebGPUSupported = false
  private isInitialized = false
  private performanceConfig: PerformanceConfig = DEFAULT_PERFORMANCE_CONFIG
  private profilingData: number[] = []
  private ort: typeof import('onnxruntime-web') | null = null

  async checkWebGPUSupport(): Promise<boolean> {
    if (!navigator.gpu) {
      log.info('WebGPU not supported, falling back to WASM')
      return false
    }

    try {
      const adapter = await navigator.gpu.requestAdapter()
      if (!adapter) {
        log.info('WebGPU adapter not available')
        return false
      }
      
      const device = await adapter.requestDevice()
      if (!device) {
        log.info('WebGPU device not available')
        return false
      }
      
      log.info('WebGPU is supported and available')
      return true
    } catch (error) {
      log.warn('WebGPU check failed', { error })
      return false
    }
  }

  async initialize(
    modelData: Uint8Array, 
    config: ModelConfig,
    performanceConfig?: Partial<PerformanceConfig>
  ): Promise<boolean> {
    if (this.isInitialized) {
      return true
    }

    try {
      if (!this.ort) {
        this.ort = await import('onnxruntime-web')
        this.ort.env.wasm.wasmPaths = '/wasm/'
      }

      this.performanceConfig = { 
        ...getOptimalConfig(), 
        ...performanceConfig 
      }

      if (this.performanceConfig.executionProvider === 'auto') {
        this.isWebGPUSupported = await this.checkWebGPUSupport()
      } else {
        this.isWebGPUSupported = this.performanceConfig.executionProvider === 'webgpu'
      }
      
      const executionProviders: (string | { name: string })[] = this.isWebGPUSupported
        ? ['webgpu']
        : ['wasm']

      log.info('Initializing ONNX Runtime', { 
        executionProviders,
        modelSize: modelData.length,
        performanceConfig: this.performanceConfig
      })

      this.ort.env.wasm.numThreads = 1
      this.ort.env.wasm.simd = true

      const sessionOptions: import('onnxruntime-web').InferenceSession.SessionOptions = {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      }

      this.session = await this.ort.InferenceSession.create(modelData, sessionOptions)

      this.modelConfig = config
      this.isInitialized = true

      log.info('ONNX Runtime initialized successfully', {
        inputNames: this.session.inputNames,
        outputNames: this.session.outputNames,
        threads: this.performanceConfig.numThreads,
        simd: this.performanceConfig.enableSIMD,
      })

      return true
    } catch (error) {
      log.error('Failed to initialize ONNX Runtime', { error })
      return false
    }
  }

  async runInference(inputData: Float32Array): Promise<InferenceResult | null> {
    if (!this.session || !this.modelConfig || !this.ort) {
      log.error('ONNX Engine not initialized')
      return null
    }

    try {
      const startTime = performance.now()

      const { inputName, inputShape } = this.modelConfig
      const tensor = new this.ort.Tensor('float32', inputData, inputShape)
      const feeds: Record<string, import('onnxruntime-web').Tensor> = { [inputName]: tensor }

      const results = await this.session.run(feeds)
      
      const output = results[this.modelConfig.outputName]
      const inferenceTime = performance.now() - startTime

      if (this.performanceConfig.enableProfiling) {
        this.profilingData.push(inferenceTime)
      }

      log.debug('Inference completed', { 
        inferenceTime: inferenceTime.toFixed(2) + 'ms',
        outputShape: output.dims 
      })

      return {
        output: output.data as Float32Array,
        shape: Array.from(output.dims),
        inferenceTime,
      }
    } catch (error) {
      log.error('Inference failed', { error })
      return null
    }
  }

  getProfilingStats(): { avg: number; min: number; max: number; count: number } | null {
    if (this.profilingData.length === 0) return null

    const sum = this.profilingData.reduce((a, b) => a + b, 0)
    return {
      avg: sum / this.profilingData.length,
      min: Math.min(...this.profilingData),
      max: Math.max(...this.profilingData),
      count: this.profilingData.length,
    }
  }

  clearProfilingData(): void {
    this.profilingData = []
  }

  async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release()
      this.session = null
      this.isInitialized = false
      this.profilingData = []
      log.info('ONNX Engine disposed')
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.session !== null
  }

  getExecutionProvider(): string {
    return this.isWebGPUSupported ? 'webgpu' : 'wasm'
  }

  getPerformanceConfig(): PerformanceConfig {
    return { ...this.performanceConfig }
  }
}

export const onnxEngine = new ONNXEngine()
