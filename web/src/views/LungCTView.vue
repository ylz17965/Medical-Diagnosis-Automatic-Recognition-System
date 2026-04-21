<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { MainLayout } from '@/layouts'
import { useVTKVolumeRenderer, WINDOW_PRESETS } from '@/composables/useVTKVolumeRenderer'
import { useSimulatedCTData } from '@/composables/useSimulatedCTData'
import { loadMHDFile } from '@/utils/mhdParser'
import { segmentationFactory, type SegmentationMethod } from '@/components/business/LungViewer/core/SegmentationFactory'
import type { SegmentedLungs } from '@/components/business/LungViewer/types/segmentation'
import type { PerformanceConfig } from '@/components/business/LungViewer/config/performance'
import dicomParser from 'dicom-parser'
import createLogger from '@/utils/logger'

const log = createLogger('LungCTView')
const router = useRouter()

const containerRef = ref<HTMLDivElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const mhdInputRef = ref<HTMLInputElement | null>(null)

const {
  isReady,
  fps,
  isLoading,
  currentPreset,
  loadDICOMData,
  applyWindowPreset,
  resize,
} = useVTKVolumeRenderer(containerRef)

const { isGenerating, generateLungCT, generateSimpleSphere } = useSimulatedCTData()

const currentFile = ref<File[] | null>(null)
const errorMessage = ref('')
const metadata = ref<Record<string, unknown> | null>(null)
const isSimulatedData = ref(false)
const isMHDData = ref(false)

// 分割相关状态
const isSegmenting = ref(false)
const segmentationProgress = ref(0)
const segmentationMethod = ref<SegmentationMethod>('auto')
const segmentationResult = ref<SegmentedLungs | null>(null)
const inferenceTime = ref(0)
const capabilities = ref<{
  deepLearning: boolean
  webGPU: boolean
  webAssembly: boolean
} | null>(null)

// GPU加速配置
const useGPU = ref(true)
const executionProvider = ref<'webgpu' | 'wasm' | 'auto'>('webgpu')
const currentProvider = ref<string>('')
const performanceConfig = computed<Partial<PerformanceConfig>>(() => ({
  executionProvider: executionProvider.value,
  enableProfiling: true,
}))

// 体数据缓存
const volumeDataCache = ref<{
  scalars: Float32Array
  dimensions: [number, number, number]
} | null>(null)

// 分割统计
const segmentationStats = computed(() => {
  if (!segmentationResult.value) return null
  const left = segmentationResult.value.leftLungBounds
  const right = segmentationResult.value.rightLungBounds
  return {
    leftSize: `${left.max.x - left.min.x}×${left.max.y - left.min.y}×${left.max.z - left.min.z}`,
    rightSize: `${right.max.x - right.min.x}×${right.max.y - right.min.y}×${right.max.z - right.min.z}`,
    inferenceTime: inferenceTime.value
  }
})

onMounted(async () => {
  window.addEventListener('resize', handleResize)
  capabilities.value = await segmentationFactory.checkCapabilities()
  log.info('Capabilities', capabilities.value)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  errorMessage.value = ''
  currentFile.value = Array.from(files)
  isSimulatedData.value = false
  segmentationResult.value = null

  try {
    const result = await loadDICOMFiles(Array.from(files))
    
    if (result) {
      metadata.value = result.metadata
      volumeDataCache.value = {
        scalars: result.scalars,
        dimensions: result.dimensions
      }
      await loadDICOMData(result.scalars, result.dimensions, result.spacing)
    }
  } catch (error: unknown) {
    log.error('Failed to load DICOM', { error })
    errorMessage.value = (error as Error).message || '加载DICOM文件失败'
  }

  input.value = ''
}

async function loadSimulatedLung() {
  errorMessage.value = ''
  isSimulatedData.value = true
  currentFile.value = [{ name: 'Simulated Lung CT', size: 0 } as File]
  segmentationResult.value = null
  
  try {
    const data = await generateLungCT(128)
    metadata.value = data.metadata
    volumeDataCache.value = {
      scalars: data.scalars,
      dimensions: data.dimensions
    }
    await loadDICOMData(data.scalars, data.dimensions, data.spacing)
    applyWindowPreset('lung')
  } catch (error: unknown) {
    log.error('Failed to generate simulated data', { error })
    errorMessage.value = (error as Error).message || '生成模拟数据失败'
  }
}

async function loadSimulatedSphere() {
  errorMessage.value = ''
  isSimulatedData.value = true
  currentFile.value = [{ name: 'Test Sphere', size: 0 } as File]
  segmentationResult.value = null
  
  try {
    const data = await generateSimpleSphere(64)
    metadata.value = data.metadata
    volumeDataCache.value = {
      scalars: data.scalars,
      dimensions: data.dimensions
    }
    await loadDICOMData(data.scalars, data.dimensions, data.spacing)
  } catch (error: unknown) {
    log.error('Failed to generate simulated data', { error })
    errorMessage.value = (error as Error).message || '生成模拟数据失败'
  }
}

async function handleMHDFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length < 2) {
    errorMessage.value = '请同时选择 .mhd 和 .raw 文件'
    return
  }

  const fileArray = Array.from(files)
  const mhdFile = fileArray.find(f => f.name.endsWith('.mhd'))
  const rawFile = fileArray.find(f => f.name.endsWith('.raw'))

  if (!mhdFile || !rawFile) {
    errorMessage.value = '需要同时选择 .mhd 和 .raw 文件'
    return
  }

  errorMessage.value = ''
  isSimulatedData.value = false
  isMHDData.value = true
  currentFile.value = [mhdFile, rawFile]
  segmentationResult.value = null

  try {
    isLoading.value = true
    const data = await loadMHDFile(mhdFile, rawFile)
    
    metadata.value = {
      fileName: mhdFile.name,
      fileSize: mhdFile.size + rawFile.size,
      width: data.dimensions[0],
      height: data.dimensions[1],
      sliceCount: data.dimensions[2],
      patientName: data.metadata.patientName,
      studyDate: data.metadata.studyDate,
      seriesDescription: data.metadata.seriesDescription,
      sliceThickness: data.spacing[2],
      windowCenter: data.metadata.windowCenter,
      windowWidth: data.metadata.windowWidth,
    }

    volumeDataCache.value = {
      scalars: data.scalars,
      dimensions: data.dimensions
    }
    await loadDICOMData(data.scalars, data.dimensions, data.spacing)
    applyWindowPreset('lung')
  } catch (error: unknown) {
    log.error('Failed to load MHD file', { error })
    errorMessage.value = (error as Error).message || '加载MHD文件失败'
  } finally {
    isLoading.value = false
  }

  input.value = ''
}

async function runSegmentation() {
  if (!volumeDataCache.value) {
    errorMessage.value = '请先加载影像数据'
    return
  }

  isSegmenting.value = true
  segmentationProgress.value = 0
  errorMessage.value = ''

  const startTime = performance.now()

  try {
    const segmentation = await segmentationFactory.createSegmentation({
      method: segmentationMethod.value,
      performanceConfig: performanceConfig.value,
      onProgress: (progress, stage) => {
        segmentationProgress.value = progress
        log.debug('Segmentation progress', { progress, stage })
      },
    })

    const { scalars, dimensions } = volumeDataCache.value
    segmentationResult.value = await segmentation.segment(scalars, dimensions)
    inferenceTime.value = performance.now() - startTime
    currentProvider.value = segmentation.getMethod() === 'deep_learning' 
      ? (capabilities.value?.webGPU ? 'WebGPU' : 'WASM') 
      : 'CPU'

    log.info('Segmentation completed', {
      inferenceTime: inferenceTime.value,
      method: segmentation.getMethod(),
      provider: currentProvider.value,
    })
  } catch (error) {
    log.error('Segmentation failed', { error })
    errorMessage.value = `分割失败: ${(error as Error).message}`
  } finally {
    isSegmenting.value = false
  }
}

function openMHDFileDialog() {
  mhdInputRef.value?.click()
}

interface DICOMParseResult {
  rows: number
  columns: number
  pixelData: Int16Array | Uint16Array
  pixelSpacing: number[]
  sliceThickness: number
  rescaleSlope: number
  rescaleIntercept: number
  windowCenter: number
  windowWidth: number
  patientName: string
  studyDate: string
  seriesDescription: string
}

async function loadDICOMFiles(files: File[]) {
  const sortedFiles = [...files].sort((a, b) => 
    a.name.localeCompare(b.name, undefined, { numeric: true })
  )

  const firstBuffer = await sortedFiles[0].arrayBuffer()
  const firstData = parseDICOM(firstBuffer)

  const rows = firstData.rows || 512
  const columns = firstData.columns || 512
  const numSlices = sortedFiles.length

  const totalPixels = rows * columns * numSlices
  const scalars = new Float32Array(totalPixels)

  for (let index = 0; index < sortedFiles.length; index++) {
    const buffer = await sortedFiles[index].arrayBuffer()
    const data = parseDICOM(buffer)

    const sliceRows = data.rows || 512
    const sliceColumns = data.columns || 512
    const sliceOffset = index * sliceRows * sliceColumns
    const slope = data.rescaleSlope || 1
    const intercept = data.rescaleIntercept || 0

    for (let i = 0; i < sliceRows * sliceColumns; i++) {
      scalars[sliceOffset + i] = data.pixelData[i] * slope + intercept
    }
  }

  const spacing: [number, number, number] = [
    firstData.pixelSpacing?.[0] || 1,
    firstData.pixelSpacing?.[1] || 1,
    firstData.sliceThickness || 1,
  ]

  const dimensions: [number, number, number] = [columns, rows, numSlices]

  return {
    scalars,
    dimensions,
    spacing,
    metadata: {
      fileName: files.length > 1 ? `${files.length} 个文件` : files[0].name,
      fileSize: files.reduce((sum, f) => sum + f.size, 0),
      width: columns,
      height: rows,
      sliceCount: numSlices,
      patientName: firstData.patientName,
      studyDate: firstData.studyDate,
      seriesDescription: firstData.seriesDescription,
      sliceThickness: firstData.sliceThickness,
      windowCenter: firstData.windowCenter,
      windowWidth: firstData.windowWidth,
    },
  }
}

function parseDICOM(buffer: ArrayBuffer): DICOMParseResult {
  const byteArray = new Uint8Array(buffer)
  const dataSet = dicomParser.parseDicom(byteArray)

  const pixelDataElement = dataSet.elements.x7fe00010
  if (!pixelDataElement) {
    throw new Error('No pixel data found')
  }

  const rows = dataSet.uint16('x00280010') || 512
  const columns = dataSet.uint16('x00280011') || 512
  const bitsAllocated = dataSet.uint16('x00280100') || 16
  const pixelRepresentation = dataSet.uint16('x00280103') || 0

  let pixelData: Int16Array | Uint16Array
  const dataOffset = pixelDataElement.dataOffset
  const dataLength = pixelDataElement.length

  if (bitsAllocated === 16) {
    if (pixelRepresentation === 1) {
      pixelData = new Int16Array(dataSet.byteArray.buffer, dataOffset, dataLength / 2)
    } else {
      pixelData = new Uint16Array(dataSet.byteArray.buffer, dataOffset, dataLength / 2)
    }
  } else {
    const uint8Data = new Uint8Array(dataSet.byteArray.buffer, dataOffset, dataLength)
    pixelData = new Uint16Array(uint8Data.length)
    for (let i = 0; i < uint8Data.length; i++) {
      pixelData[i] = uint8Data[i]
    }
  }

  const pixelSpacingStr = dataSet.string('x00280030')
  const pixelSpacing = pixelSpacingStr ? pixelSpacingStr.split('\\').map(parseFloat) : [1, 1]
  const sliceThickness = parseFloat(dataSet.string('x00180050') || '1')
  const rescaleSlope = parseFloat(dataSet.string('x00281053') || '1')
  const rescaleIntercept = parseFloat(dataSet.string('x00281052') || '0')

  const windowCenterStr = dataSet.string('x00281050')
  const windowWidthStr = dataSet.string('x00281051')
  const windowCenter = windowCenterStr ? parseFloat(windowCenterStr.split('\\')[0]) : 40
  const windowWidth = windowWidthStr ? parseFloat(windowWidthStr.split('\\')[0]) : 400

  return {
    rows,
    columns,
    pixelData,
    pixelSpacing,
    sliceThickness,
    rescaleSlope,
    rescaleIntercept,
    windowCenter,
    windowWidth,
    patientName: dataSet.string('x00100010') || 'Unknown',
    studyDate: dataSet.string('x00080020') || '',
    seriesDescription: dataSet.string('x0008103e') || '',
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    if (fileInputRef.value) {
      const dt = new DataTransfer()
      for (const file of files) {
        dt.items.add(file)
      }
      fileInputRef.value.files = dt.files
      handleFileSelect({ target: fileInputRef.value } as unknown as Event)
    }
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
}

function openFileDialog() {
  fileInputRef.value?.click()
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

function handleResize() {
  resize()
}
</script>

<template>
  <MainLayout>
    <div class="lung-ct-page">
      <div class="page-header">
        <button class="back-btn" @click="router.push('/')" aria-label="返回首页">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div class="header-content">
          <h1>肺部CT 3D可视化</h1>
          <p class="subtitle">上传CT影像进行体绘制可视化与深度学习分割</p>
        </div>
      </div>

    <div class="toolbar-section">
      <button class="toolbar-btn primary" @click="openFileDialog" :disabled="isLoading || isGenerating">
        {{ isLoading ? '加载中...' : '📁 选择DICOM文件' }}
      </button>
      <input
        ref="fileInputRef"
        type="file"
        accept=".dcm,application/dicom"
        multiple
        style="display: none"
        @change="handleFileSelect"
      />
      <button class="toolbar-btn primary" @click="openMHDFileDialog" :disabled="isLoading || isGenerating">
        📄 加载MHD文件
      </button>
      <input
        ref="mhdInputRef"
        type="file"
        accept=".mhd,.raw"
        multiple
        style="display: none"
        @change="handleMHDFileSelect"
      />
      <div class="toolbar-divider"></div>
      <button class="toolbar-btn secondary" @click="loadSimulatedLung" :disabled="isLoading || isGenerating">
        🫁 模拟肺部CT
      </button>
      <button class="toolbar-btn secondary" @click="loadSimulatedSphere" :disabled="isLoading || isGenerating">
        🔵 测试球体
      </button>
      <span v-if="currentFile" class="file-type-badge">
        {{ isSimulatedData ? '模拟数据' : (isMHDData ? 'MHD数据' : ((metadata?.sliceCount as number) || currentFile.length) + ' 层切片') }}
      </span>
    </div>

    <div class="window-presets" v-if="currentFile">
      <span class="preset-label">窗宽窗位预设：</span>
      <button
        v-for="(preset, key) in WINDOW_PRESETS"
        :key="key"
        class="preset-btn"
        :class="{ active: currentPreset === key }"
        @click="applyWindowPreset(key as string)"
      >
        {{ preset.name }}
      </button>
    </div>

    <div class="segmentation-section" v-if="currentFile">
      <div class="segmentation-header">
        <h3>🫁 肺部分割</h3>
        <div class="capabilities" v-if="capabilities">
          <span :class="['capability', { enabled: capabilities.webGPU }]">
            WebGPU: {{ capabilities.webGPU ? '✅' : '❌' }}
          </span>
          <span :class="['capability', { enabled: capabilities.deepLearning }]">
            深度学习: {{ capabilities.deepLearning ? '✅' : '❌' }}
          </span>
        </div>
      </div>
      
      <div class="gpu-config">
        <div class="config-row">
          <label class="config-label">
            <input type="checkbox" v-model="useGPU" :disabled="!capabilities?.webGPU" />
            <span>启用GPU加速</span>
          </label>
          <select 
            v-model="executionProvider" 
            class="provider-select"
            :disabled="!useGPU"
          >
            <option value="webgpu" :disabled="!capabilities?.webGPU">WebGPU (推荐)</option>
            <option value="wasm">WebAssembly (CPU)</option>
            <option value="auto">自动选择</option>
          </select>
        </div>
        <div class="config-hint" v-if="!capabilities?.webGPU">
          ⚠️ 您的浏览器不支持WebGPU，将使用CPU运行
        </div>
      </div>
      
      <div class="segmentation-controls">
        <select v-model="segmentationMethod" class="method-select">
          <option value="auto">自动选择</option>
          <option value="deep_learning">深度学习 (U-Net)</option>
          <option value="threshold">阈值分割</option>
        </select>
        
        <button 
          class="segmentation-btn" 
          :disabled="isSegmenting || !volumeDataCache"
          @click="runSegmentation"
        >
          {{ isSegmenting ? `分割中... ${segmentationProgress.toFixed(0)}%` : '🚀 开始分割' }}
        </button>
      </div>

      <div v-if="segmentationStats" class="segmentation-result">
        <div class="result-item">
          <span class="result-label">左肺尺寸</span>
          <span class="result-value">{{ segmentationStats.leftSize }}</span>
        </div>
        <div class="result-item">
          <span class="result-label">右肺尺寸</span>
          <span class="result-value">{{ segmentationStats.rightSize }}</span>
        </div>
        <div class="result-item">
          <span class="result-label">推理时间</span>
          <span class="result-value">{{ segmentationStats.inferenceTime.toFixed(0) }}ms</span>
        </div>
        <div class="result-item" v-if="currentProvider">
          <span class="result-label">执行设备</span>
          <span class="result-value provider">{{ currentProvider }}</span>
        </div>
      </div>
    </div>

    <div class="content-section">
      <div
        ref="containerRef"
        class="viewer-container"
        @drop="handleDrop"
        @dragover="handleDragOver"
      >
        <div v-if="!currentFile" class="upload-hint">
          <div class="hint-content">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <path d="M3.27 6.96L12 12l8.73-5.04"/>
              <path d="M12 12V3"/>
            </svg>
            <p>上传DICOM或MHD文件进行体绘制</p>
            <p class="hint-formats">支持 .dcm, .mhd, .raw 格式</p>
          </div>
        </div>

        <div v-if="isLoading" class="loading-overlay">
          <div class="loading-spinner"></div>
          <p>正在加载影像数据...</p>
        </div>

        <div v-if="isReady && currentFile" class="fps-display">
          {{ fps }} FPS
        </div>
      </div>
    </div>

    <div class="controls-info" v-if="currentFile">
      <p>🖱️ 鼠标左键旋转 | 右键平移 | 滚轮缩放</p>
    </div>

    <div class="error-message" v-if="errorMessage">
      <p>{{ errorMessage }}</p>
    </div>

    <div class="info-section" v-if="metadata">
      <h3>影像信息</h3>
      <div class="info-grid">
        <div class="info-card">
          <span class="info-label">文件名</span>
          <span class="info-value">{{ metadata.fileName }}</span>
        </div>
        <div class="info-card">
          <span class="info-label">文件大小</span>
          <span class="info-value">{{ formatFileSize(metadata.fileSize as number) }}</span>
        </div>
        <div class="info-card">
          <span class="info-label">图像尺寸</span>
          <span class="info-value">{{ metadata.width }} x {{ metadata.height }}</span>
        </div>
        <div class="info-card">
          <span class="info-label">切片数量</span>
          <span class="info-value">{{ metadata.sliceCount }}</span>
        </div>
        <div class="info-card">
          <span class="info-label">患者姓名</span>
          <span class="info-value">{{ metadata.patientName || '-' }}</span>
        </div>
        <div class="info-card">
          <span class="info-label">检查日期</span>
          <span class="info-value">{{ metadata.studyDate || '-' }}</span>
        </div>
        <div class="info-card">
          <span class="info-label">层厚</span>
          <span class="info-value">{{ (metadata.sliceThickness as number)?.toFixed(2) || '-' }} mm</span>
        </div>
        <div class="info-card">
          <span class="info-label">窗宽/窗位</span>
          <span class="info-value">W{{ metadata.windowWidth }} / L{{ metadata.windowCenter }}</span>
        </div>
      </div>
    </div>

    <div class="disclaimer">
      <p>⚠️ 本系统仅供辅助参考，生成的3D模型和分割结果不能替代专业医生的诊断。</p>
    </div>
    </div>
  </MainLayout>
</template>

<style scoped>
.lung-ct-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.4);
  border-radius: 8px;
  color: #818cf8;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.back-btn:hover {
  background: rgba(99, 102, 241, 0.3);
  border-color: #818cf8;
}

.header-content {
  flex: 1;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px 0;
}

.page-header .subtitle {
  color: #888;
  font-size: 14px;
  margin: 0;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: #16213e;
  border-radius: 8px;
  flex-wrap: wrap;
}

.toolbar-btn {
  padding: 10px 20px;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.toolbar-btn.primary {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}

.toolbar-btn.primary:hover {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-btn.secondary {
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.4);
}

.toolbar-btn.secondary:hover {
  background: rgba(99, 102, 241, 0.3);
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 8px;
}

.file-type-badge {
  padding: 6px 12px;
  background: rgba(99, 102, 241, 0.2);
  color: #818cf8;
  border-radius: 4px;
  font-size: 13px;
}

.window-presets {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 16px;
  background: #16213e;
  border-radius: 8px;
  flex-wrap: wrap;
}

.preset-label {
  color: #888;
  font-size: 13px;
  margin-right: 4px;
}

.preset-btn {
  padding: 6px 14px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 4px;
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: rgba(99, 102, 241, 0.2);
  color: #e2e8f0;
}

.preset-btn.active {
  background: rgba(99, 102, 241, 0.3);
  border-color: #818cf8;
  color: #e2e8f0;
}

.segmentation-section {
  margin-bottom: 16px;
  padding: 16px;
  background: #16213e;
  border-radius: 8px;
}

.segmentation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.segmentation-header h3 {
  font-size: 16px;
  color: #fff;
  margin: 0;
}

.capabilities {
  display: flex;
  gap: 12px;
}

.capability {
  font-size: 12px;
  color: #666;
}

.capability.enabled {
  color: #4ade80;
}

.gpu-config {
  margin-bottom: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.config-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e2e8f0;
  font-size: 14px;
  cursor: pointer;
}

.config-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #10b981;
}

.provider-select {
  padding: 6px 12px;
  background: #1a1a2e;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 4px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.provider-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.config-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #fbbf24;
}

.segmentation-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.method-select {
  padding: 8px 12px;
  background: #1a1a2e;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.segmentation-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.segmentation-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669, #047857);
}

.segmentation-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.segmentation-result {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.result-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-label {
  font-size: 12px;
  color: #888;
}

.result-value {
  font-size: 14px;
  color: #4ade80;
  font-weight: 500;
}

.result-value.provider {
  color: #818cf8;
}

.content-section {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.viewer-container {
  width: 100%;
  height: 500px;
  position: relative;
  background: #0a0a0a;
  border-radius: 8px;
  overflow: hidden;
}

.viewer-container :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.upload-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  cursor: pointer;
}

.hint-content {
  text-align: center;
  color: #888;
}

.hint-content svg {
  margin-bottom: 20px;
  color: #555;
}

.hint-content p {
  margin: 8px 0;
  font-size: 16px;
}

.hint-formats {
  font-size: 13px;
  color: #555;
  margin-top: 12px !important;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  z-index: 10;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(99, 102, 241, 0.3);
  border-top-color: #818cf8;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-overlay p {
  margin-top: 16px;
  color: #888;
}

.fps-display {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.7);
  color: #4ade80;
  font-size: 12px;
  font-family: monospace;
  border-radius: 4px;
}

.controls-info {
  padding: 12px;
  background: #16213e;
  border-radius: 6px;
  text-align: center;
  margin-bottom: 24px;
}

.controls-info p {
  margin: 0;
  color: #888;
  font-size: 13px;
}

.error-message {
  padding: 12px;
  background: rgba(233, 69, 96, 0.1);
  border: 1px solid rgba(233, 69, 96, 0.3);
  border-radius: 6px;
  margin-bottom: 24px;
}

.error-message p {
  margin: 0;
  color: #e94560;
  font-size: 13px;
}

.info-section {
  margin-bottom: 24px;
}

.info-section h3 {
  font-size: 18px;
  color: #fff;
  margin-bottom: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.info-card {
  background: #16213e;
  padding: 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-label {
  font-size: 12px;
  color: #888;
}

.info-value {
  font-size: 15px;
  color: #fff;
  font-weight: 500;
}

.disclaimer {
  background: rgba(233, 69, 96, 0.1);
  border: 1px solid rgba(233, 69, 96, 0.3);
  border-radius: 8px;
  padding: 16px;
}

.disclaimer p {
  color: #e94560;
  font-size: 14px;
  margin: 0;
}
</style>
