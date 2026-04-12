<script setup lang="ts">
import { ref, onBeforeUnmount, computed } from 'vue'
import dicomParser from 'dicom-parser'

interface Props {
  width?: number
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  width: 600,
  height: 600
})

const emit = defineEmits<{
  (e: 'loaded', metadata: any): void
  (e: 'error', error: Error): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const imageUrl = ref('')

const isLoading = ref(false)
const currentFile = ref<File | null>(null)
const errorMessage = ref('')
const fileType = ref<'dicom' | 'image' | null>(null)
const metadata = ref<any>(null)
const dicomData = ref<{ pixels: Uint8ClampedArray; width: number; height: number } | null>(null)

const validDicomTypes = ['application/dicom', 'application/octet-stream']
const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  isLoading.value = true
  errorMessage.value = ''
  currentFile.value = files[0]
  const file = files[0]

  try {
    if (validDicomTypes.includes(file.type) || file.name.toLowerCase().endsWith('.dcm')) {
      await handleDicomFile(file)
    } else if (validImageTypes.includes(file.type)) {
      await handleImageFile(file)
    } else {
      throw new Error('不支持的文件格式，支持 DICOM(.dcm) 和图片(PNG/JPG)')
    }
  } catch (error: any) {
    console.error('Failed to load file:', error)
    errorMessage.value = error.message || '加载失败'
    emit('error', error)
  } finally {
    isLoading.value = false
  }
}

async function handleImageFile(file: File) {
  fileType.value = 'image'
  const url = URL.createObjectURL(file)
  imageUrl.value = url

  const img = new Image()
  img.src = url
  
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })

  metadata.value = {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    lastModified: new Date(file.lastModified).toLocaleString(),
    width: img.width,
    height: img.height,
    isDicom: false
  }

  dicomData.value = null
  emit('loaded', metadata.value)
}

async function handleDicomFile(file: File) {
  fileType.value = 'dicom'
  
  const arrayBuffer = await readFileAsArrayBuffer(file)
  const byteArray = new Uint8Array(arrayBuffer)
  const dataSet = dicomParser.parseDicom(byteArray)
  
  const rows = dataSet.uint16('x00280010') || 512
  const columns = dataSet.uint16('x00280011') || 512
  const wc = dataSet.floatString('x00281050') || 40
  const ww = dataSet.floatString('x00281051') || 400
  const intercept = dataSet.floatString('x00281052') || 0
  const slope = dataSet.floatString('x00281053') || 1

  const pixelElement = dataSet.elements['x7fe00010'] as any
  if (!pixelElement) {
    throw new Error('未找到像素数据')
  }

  const bitsAllocated = (pixelElement as any).bitsAllocated || 16
  const dataOffset = (pixelElement as any).dataOffset
  const length = (pixelElement as any).length

  let rawData: Uint16Array | Uint8Array
  if (bitsAllocated === 16) {
    rawData = new Uint16Array(arrayBuffer, dataOffset, length / 2)
  } else {
    rawData = new Uint8Array(arrayBuffer, dataOffset, length)
  }

  const expectedPixels = rows * columns
  const huData = new Float32Array(expectedPixels)
  const dataLength = Math.min(rawData.length, expectedPixels)
  
  for (let i = 0; i < dataLength; i++) {
    huData[i] = rawData[i] * slope + intercept
  }
  for (let i = dataLength; i < expectedPixels; i++) {
    huData[i] = -1000
  }

  const pixels = new Uint8ClampedArray(expectedPixels * 4)
  for (let i = 0; i < expectedPixels; i++) {
    let value = huData[i]
    let normalized = (value - (wc - ww / 2)) / ww
    normalized = Math.max(0, Math.min(1, normalized))
    const gray = Math.floor(normalized * 255)

    pixels[i * 4] = gray
    pixels[i * 4 + 1] = gray
    pixels[i * 4 + 2] = gray
    pixels[i * 4 + 3] = 255
  }

  dicomData.value = { pixels, width: columns, height: rows }
  
  const canvas = document.createElement('canvas')
  canvas.width = columns
  canvas.height = rows
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const imageData = new ImageData(pixels, columns, rows)
    ctx.putImageData(imageData, 0, 0)
    imageUrl.value = canvas.toDataURL('image/png')
  }

  metadata.value = {
    fileName: file.name,
    fileSize: file.size,
    fileType: 'application/dicom',
    lastModified: new Date(file.lastModified).toLocaleString(),
    width: columns,
    height: rows,
    rows,
    columns,
    sliceThickness: dataSet.floatString('x00180050'),
    windowCenter: wc,
    windowWidth: ww,
    patientName: dataSet.string('x00100010'),
    studyDate: dataSet.string('x00080020'),
    modality: dataSet.string('x00080060'),
    isDicom: true
  }

  emit('loaded', metadata.value)
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    const dt = new DataTransfer()
    dt.items.add(file)
    if (fileInputRef.value) {
      fileInputRef.value.files = dt.files
      handleFileSelect({ target: fileInputRef.value } as any)
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
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const isDicom = computed(() => fileType.value === 'dicom')

onBeforeUnmount(() => {
  if (imageUrl.value && imageUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(imageUrl.value)
  }
  currentFile.value = null
  imageUrl.value = ''
  dicomData.value = null
})
</script>

<template>
  <div class="image-viewer">
    <div class="viewer-toolbar">
      <div class="toolbar-left">
        <button class="toolbar-btn" @click="openFileDialog" :disabled="isLoading">
          {{ isLoading ? '加载中...' : '选择文件' }}
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".dcm,image/png,image/jpeg,image/jpg"
          style="display: none"
          @change="handleFileSelect"
        />
      </div>
      
      <div class="toolbar-right" v-if="currentFile">
        <span class="file-type-badge" :class="{ dicom: isDicom }">
          {{ isDicom ? 'DICOM' : '图片' }}
        </span>
      </div>
    </div>
    
    <div class="viewer-content">
      <div 
        class="viewer-container"
        :style="{ width: props.width + 'px', height: props.height + 'px' }"
        @drop="handleDrop"
        @dragover="handleDragOver"
      >
        <div v-if="!currentFile" class="upload-hint">
          <div class="hint-content">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17,8 12,3 7,8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p>拖拽文件到此处</p>
            <p class="hint-formats">支持 DICOM(.dcm) 和 PNG/JPG 图片</p>
          </div>
        </div>
        
        <div v-if="currentFile && imageUrl" class="image-wrapper">
          <img :src="imageUrl" class="preview-image" />
        </div>
        
        <div v-if="isLoading" class="loading-overlay">
          <div class="spinner"></div>
          <p>正在加载...</p>
        </div>
      </div>
    </div>
    
    <div class="error-message" v-if="errorMessage">
      <p>{{ errorMessage }}</p>
    </div>
    
    <div class="info-section" v-if="metadata">
      <div class="info-grid">
        <div class="info-card">
          <span class="info-label">文件名</span>
          <span class="info-value">{{ metadata.fileName }}</span>
        </div>
        <div class="info-card">
          <span class="info-label">文件大小</span>
          <span class="info-value">{{ formatFileSize(metadata.fileSize) }}</span>
        </div>
        <div class="info-card">
          <span class="info-label">文件类型</span>
          <span class="info-value">{{ isDicom ? 'DICOM' : metadata.fileType }}</span>
        </div>
        <div class="info-card">
          <span class="info-label">图像尺寸</span>
          <span class="info-value">{{ metadata.width }} x {{ metadata.height }}</span>
        </div>
        <template v-if="isDicom">
          <div class="info-card">
            <span class="info-label">患者姓名</span>
            <span class="info-value">{{ metadata.patientName || '-' }}</span>
          </div>
          <div class="info-card">
            <span class="info-label">检查日期</span>
            <span class="info-value">{{ metadata.studyDate || '-' }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-viewer {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: #1a1a2e;
  border-radius: 8px;
}

.viewer-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #16213e;
  border-radius: 6px;
}

.toolbar-btn {
  padding: 8px 16px;
  background: #0f3460;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.toolbar-btn:hover {
  background: #1a4a7a;
}

.toolbar-btn:disabled {
  opacity: 0.5;
}

.file-type-badge {
  padding: 4px 8px;
  background: #10b981;
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.file-type-badge.dicom {
  background: #8b5cf6;
}

.viewer-content {
  display: flex;
  gap: 16px;
}

.viewer-container {
  position: relative;
  background: #0a0a0a;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 8px;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
}

.upload-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
}

.hint-content {
  text-align: center;
  color: #888;
}

.hint-content svg {
  margin-bottom: 16px;
}

.hint-content p {
  margin: 8px 0;
}

.hint-formats {
  font-size: 12px;
  color: #555;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #e94560;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  padding: 12px;
  background: rgba(233, 69, 96, 0.1);
  border: 1px solid rgba(233, 69, 96, 0.3);
  border-radius: 6px;
}

.error-message p {
  margin: 0;
  color: #e94560;
  font-size: 13px;
}

.info-section {
  padding: 12px;
  background: #16213e;
  border-radius: 6px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.info-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: #888;
}

.info-value {
  font-size: 14px;
  color: #fff;
}
</style>
