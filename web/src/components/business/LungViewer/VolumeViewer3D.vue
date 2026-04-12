<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
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
const canvasRef = ref<HTMLCanvasElement | null>(null)

const isLoading = ref(false)
const currentFile = ref<File | null>(null)
const errorMessage = ref('')
const fileType = ref<'dicom' | 'image' | null>(null)
const metadata = ref<any>(null)

let rotationX = 0
let rotationY = 0
let zoom = 1
let isDragging = false
let lastX = 0
let lastY = 0
let imagePixels: Uint8ClampedArray | null = null
let imageWidth = 0
let imageHeight = 0

const validDicomTypes = ['application/dicom', 'application/octet-stream']
const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']

const isDicom = computed(() => fileType.value === 'dicom')

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  isLoading.value = true
  errorMessage.value = ''
  currentFile.value = files[0]
  const file = files[0]

  try {
    resetTransform()
    
    if (validDicomTypes.includes(file.type) || file.name.toLowerCase().endsWith('.dcm')) {
      await handleDicomFile(file)
    } else if (validImageTypes.includes(file.type)) {
      await handleImageFile(file)
    } else {
      throw new Error('不支持的文件格式，支持 DICOM(.dcm) 和图片(PNG/JPG)')
    }
    
    render3D()
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
  const img = new Image()
  img.src = url
  
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })

  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, img.width, img.height)
    imagePixels = imageData.data
    imageWidth = img.width
    imageHeight = img.height
  }

  URL.revokeObjectURL(url)

  metadata.value = {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    width: img.width,
    height: img.height,
    isDicom: false
  }

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

  imagePixels = new Uint8ClampedArray(expectedPixels * 4)
  imageWidth = columns
  imageHeight = rows

  for (let i = 0; i < expectedPixels; i++) {
    let value = huData[i]
    let normalized = (value - (wc - ww / 2)) / ww
    normalized = Math.max(0, Math.min(1, normalized))
    const gray = Math.floor(normalized * 255)

    imagePixels[i * 4] = gray
    imagePixels[i * 4 + 1] = gray
    imagePixels[i * 4 + 2] = gray
    imagePixels[i * 4 + 3] = 255
  }

  metadata.value = {
    fileName: file.name,
    fileSize: file.size,
    fileType: 'application/dicom',
    width: columns,
    height: rows,
    rows,
    columns,
    sliceThickness: dataSet.floatString('x00180050'),
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

function render3D() {
  if (!canvasRef.value || !imagePixels) return

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = props.width
  const height = props.height
  canvas.width = width
  canvas.height = height

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.scale(zoom, zoom)
  ctx.rotate(rotationX)
  ctx.rotate(rotationY)

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = imageWidth
  tempCanvas.height = imageHeight
  const tempCtx = tempCanvas.getContext('2d')
  if (tempCtx && imagePixels) {
    const pixelsArray = new Uint8ClampedArray(imagePixels)
    const imgData = new ImageData(pixelsArray, imageWidth, imageHeight)
    tempCtx.putImageData(imgData, 0, 0)

    const maxDim = Math.max(imageWidth, imageHeight)
    const scale = Math.min(width, height) * 0.8 / maxDim
    const scaledWidth = imageWidth * scale
    const scaledHeight = imageHeight * scale

    ctx.drawImage(tempCanvas, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)
  }

  ctx.restore()
}

function handleMouseDown(event: MouseEvent) {
  isDragging = true
  lastX = event.clientX
  lastY = event.clientY
}

function handleMouseMove(event: MouseEvent) {
  if (!isDragging) return

  const deltaX = event.clientX - lastX
  const deltaY = event.clientY - lastY

  rotationY += deltaX * 0.01
  rotationX += deltaY * 0.01

  render3D()
  lastX = event.clientX
  lastY = event.clientY
}

function handleMouseUp() {
  isDragging = false
}

function handleWheel(event: WheelEvent) {
  event.preventDefault()
  zoom *= event.deltaY > 0 ? 0.9 : 1.1
  zoom = Math.max(0.3, Math.min(3, zoom))
  render3D()
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    const dt = new DataTransfer()
    dt.items.add(files[0])
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

function resetTransform() {
  rotationX = 0
  rotationY = 0
  zoom = 1
  render3D()
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

onMounted(() => {
  render3D()
})

onBeforeUnmount(() => {
  currentFile.value = null
  imagePixels = null
})
</script>

<template>
  <div class="volume-viewer">
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
      
      <div class="toolbar-center" v-if="currentFile">
        <button class="toolbar-btn small" @click="resetTransform">重置视角</button>
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
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
        @wheel="handleWheel"
      >
        <canvas ref="canvasRef" class="render-canvas" />
        
        <div v-if="!currentFile" class="upload-hint">
          <div class="hint-content">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <p>拖拽文件到此处</p>
            <p class="hint-formats">支持 DICOM(.dcm) 和 PNG/JPG 图片</p>
            <p class="hint-controls">🖱️ 拖拽旋转 | 滚轮缩放</p>
          </div>
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
.volume-viewer {
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

.toolbar-btn.small {
  padding: 4px 12px;
  font-size: 12px;
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
  cursor: grab;
}

.viewer-container:active {
  cursor: grabbing;
}

.render-canvas {
  width: 100%;
  height: 100%;
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

.hint-controls {
  margin-top: 16px !important;
  color: #e94560;
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
