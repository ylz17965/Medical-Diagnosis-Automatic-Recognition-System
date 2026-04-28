<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { MainLayout } from '@/layouts'
import { useVTKVolumeRenderer, WINDOW_PRESETS } from '@/composables/useVTKVolumeRenderer'
import { useSimulatedCTData } from '@/composables/useSimulatedCTData'
import { loadMHDFile } from '@/utils/mhdParser'
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

const volumeDataCache = ref<{
  scalars: Float32Array
  dimensions: [number, number, number]
} | null>(null)

onMounted(() => {
  window.addEventListener('resize', handleResize)
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
          <p class="subtitle">上传CT影像进行体绘制可视化与肺部分割</p>
        </div>
      </div>

    <div class="toolbar-section">
      <button class="toolbar-btn primary" @click="openFileDialog" :disabled="isLoading || isGenerating">
        {{ isLoading ? '加载中...' : '选择DICOM文件' }}
      </button>
      <input
        ref="fileInputRef"
        type="file"
        id="dicom-file-input"
        name="dicom-files"
        accept=".dcm,application/dicom"
        multiple
        style="display: none"
        @change="handleFileSelect"
      />
      <button class="toolbar-btn primary" @click="openMHDFileDialog" :disabled="isLoading || isGenerating">
        加载MHD文件
      </button>
      <input
        ref="mhdInputRef"
        type="file"
        id="mhd-file-input"
        name="mhd-files"
        accept=".mhd,.raw"
        multiple
        style="display: none"
        @change="handleMHDFileSelect"
      />
      <div class="toolbar-divider"></div>
      <button class="toolbar-btn secondary" @click="loadSimulatedLung" :disabled="isLoading || isGenerating">
        模拟肺部CT
      </button>
      <button class="toolbar-btn secondary" @click="loadSimulatedSphere" :disabled="isLoading || isGenerating">
        测试球体
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
      <p>鼠标左键旋转 | 滚轮缩放</p>
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
      <p>本系统仅供辅助参考，生成的3D模型和分割结果不能替代专业医生的诊断。</p>
    </div>
    </div>
  </MainLayout>
</template>

<style scoped>
.lung-ct-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--spacing-6);
}

.page-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-6);
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--color-primary-bg);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  color: var(--color-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.back-btn:hover {
  background: var(--color-fill-primary);
}

.header-content {
  flex: 1;
}

.page-header h1 {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-2) 0;
}

.page-header .subtitle {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  margin: 0;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
  padding: var(--spacing-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  flex-wrap: wrap;
}

.toolbar-btn {
  padding: var(--spacing-2) var(--spacing-5);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.toolbar-btn.primary {
  background: var(--color-primary-gradient);
}

.toolbar-btn.primary:hover {
  opacity: 0.9;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-btn.secondary {
  background: var(--color-primary-bg);
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
}

.toolbar-btn.secondary:hover {
  background: var(--color-fill-primary);
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--color-border);
  margin: 0 var(--spacing-2);
}

.file-type-badge {
  padding: var(--spacing-1) var(--spacing-3);
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
}

.window-presets {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-4);
  padding: var(--spacing-2) var(--spacing-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  flex-wrap: wrap;
}

.preset-label {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  margin-right: var(--spacing-1);
}

.preset-btn {
  padding: var(--spacing-1) var(--spacing-3);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.preset-btn:hover {
  background: var(--color-fill-primary);
  color: var(--color-text-primary);
}

.preset-btn.active {
  background: var(--color-primary-bg);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.content-section {
  display: flex;
  justify-content: center;
  margin-bottom: var(--spacing-4);
}

.viewer-container {
  width: 100%;
  height: 500px;
  position: relative;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
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
  background: var(--color-bg-primary);
  cursor: pointer;
}

.hint-content {
  text-align: center;
  color: var(--color-text-tertiary);
}

.hint-content svg {
  margin-bottom: var(--spacing-5);
  color: var(--color-text-quaternary);
}

.hint-content p {
  margin: var(--spacing-2) 0;
  font-size: var(--font-size-base);
}

.hint-formats {
  font-size: var(--font-size-xs);
  color: var(--color-text-quaternary);
  margin-top: var(--spacing-3) !important;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-primary);
  z-index: 10;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-overlay p {
  margin-top: var(--spacing-4);
  color: var(--color-text-tertiary);
}

.fps-display {
  position: absolute;
  top: var(--spacing-2);
  left: var(--spacing-2);
  padding: var(--spacing-1) var(--spacing-2);
  background: var(--color-bg-tertiary);
  color: var(--color-risk-low);
  font-size: var(--font-size-xs);
  font-family: var(--font-family-mono);
  border-radius: var(--radius-sm);
}

.controls-info {
  padding: var(--spacing-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  text-align: center;
  margin-bottom: var(--spacing-6);
}

.controls-info p {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}

.error-message {
  padding: var(--spacing-3);
  background: var(--color-error-bg);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-6);
}

.error-message p {
  margin: 0;
  color: var(--color-error);
  font-size: var(--font-size-xs);
}

.info-section {
  margin-bottom: var(--spacing-6);
}

.info-section h3 {
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-4);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-3);
}

.info-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: var(--spacing-4);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.info-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.info-value {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.disclaimer {
  background: var(--color-error-bg);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-lg);
  padding: var(--spacing-4);
}

.disclaimer p {
  color: var(--color-error);
  font-size: var(--font-size-sm);
  margin: 0;
}
</style>
