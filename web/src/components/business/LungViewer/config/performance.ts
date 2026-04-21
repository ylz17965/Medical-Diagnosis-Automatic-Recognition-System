export interface PerformanceConfig {
  executionProvider: 'auto' | 'webgpu' | 'wasm'
  numThreads: number
  enableSIMD: boolean
  enableMemoryArena: boolean
  enableMemoryPattern: boolean
  graphOptimizationLevel: 'disabled' | 'all' | 'layout' | 'basic' | 'extended'
  enableProfiling: boolean
  batchSize: number
  sliceSkip: number
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  executionProvider: 'webgpu',
  numThreads: navigator.hardwareConcurrency || 4,
  enableSIMD: true,
  enableMemoryArena: true,
  enableMemoryPattern: true,
  graphOptimizationLevel: 'all',
  enableProfiling: false,
  batchSize: 1,
  sliceSkip: 1,
}

export const PERFORMANCE_PRESETS: Record<string, Partial<PerformanceConfig>> = {
  quality: {
    executionProvider: 'webgpu',
    batchSize: 1,
    sliceSkip: 1,
    graphOptimizationLevel: 'all',
  },
  balanced: {
    executionProvider: 'webgpu',
    batchSize: 2,
    sliceSkip: 1,
    graphOptimizationLevel: 'all',
  },
  speed: {
    executionProvider: 'webgpu',
    batchSize: 4,
    sliceSkip: 2,
    graphOptimizationLevel: 'all',
  },
}

export function getOptimalConfig(): PerformanceConfig {
  const config = { ...DEFAULT_PERFORMANCE_CONFIG }

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )

  if (isMobile) {
    config.numThreads = Math.min(config.numThreads, 2)
    config.batchSize = 1
    config.sliceSkip = 2
  }

  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  if (memory && memory < 4) {
    config.numThreads = Math.min(config.numThreads, 2)
    config.batchSize = 1
  }

  return config
}

export function estimateMemoryUsage(
  dimensions: [number, number, number],
  bytesPerVoxel: number = 4
): number {
  const [width, height, depth] = dimensions
  const volumeSize = width * height * depth * bytesPerVoxel
  const modelSize = 45 * 1024 * 1024
  const workingMemory = volumeSize * 2
  const totalMemory = volumeSize + modelSize + workingMemory

  return totalMemory
}

export function canRunInBrowser(dimensions: [number, number, number]): {
  canRun: boolean
  reason: string
  estimatedMemory: number
} {
  const estimatedMemory = estimateMemoryUsage(dimensions)
  const memoryMB = estimatedMemory / (1024 * 1024)

  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8
  const availableMemoryMB = deviceMemory * 1024 * 0.5

  if (memoryMB > availableMemoryMB) {
    return {
      canRun: false,
      reason: `需要 ${memoryMB.toFixed(0)}MB 内存，但仅 ${availableMemoryMB.toFixed(0)}MB 可用`,
      estimatedMemory,
    }
  }

  return {
    canRun: true,
    reason: `预计使用 ${memoryMB.toFixed(0)}MB 内存`,
    estimatedMemory,
  }
}
