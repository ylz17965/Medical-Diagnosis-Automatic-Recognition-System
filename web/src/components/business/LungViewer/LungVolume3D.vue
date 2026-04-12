<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import dicomParser from 'dicom-parser'

interface DicomSlice {
  pixels: Float32Array
  rows: number
  columns: number
  sliceLocation?: number
}

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

const containerRef = ref<HTMLDivElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const isLoading = ref(false)
const currentFile = ref<File | null>(null)
const errorMessage = ref('')
const metadata = ref<any>(null)
const progress = ref(0)

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let mesh: THREE.Mesh | null = null
let animationId: number | null = null

let slices: DicomSlice[] = []

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  isLoading.value = true
  errorMessage.value = ''
  progress.value = 0

  try {
    const file = files[0]
    currentFile.value = file

    if (file.name.toLowerCase().endsWith('.dcm') || file.type === 'application/dicom') {
      await handleDicomFile(file)
    } else if (file.type.startsWith('image/')) {
      await handleImageFile(file)
    } else {
      throw new Error('请上传 DICOM(.dcm) 文件或图片文件')
    }
  } catch (error: any) {
    console.error('Failed to load:', error)
    errorMessage.value = error.message || '加载失败'
    emit('error', error)
  } finally {
    isLoading.value = false
  }
}

async function handleImageFile(file: File) {
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
    
    const pixels = new Float32Array(img.width * img.height)
    for (let i = 0; i < pixels.length; i++) {
      const gray = imageData.data[i * 4] * 0.299 + imageData.data[i * 4 + 1] * 0.587 + imageData.data[i * 4 + 2] * 0.114
      pixels[i] = gray
    }

    slices = [{
      pixels,
      rows: img.height,
      columns: img.width
    }]
  }

  URL.revokeObjectURL(url)

  metadata.value = {
    fileName: file.name,
    fileSize: file.size,
    width: img.width,
    height: img.height,
    sliceCount: 1,
    isDicom: false
  }

  emit('loaded', metadata.value)
  initThreeJS()
  createVolumeFromSlices()
}

async function handleDicomFile(file: File) {
  const arrayBuffer = await readFileAsArrayBuffer(file)
  const byteArray = new Uint8Array(arrayBuffer)
  
  try {
    const dataSet = dicomParser.parseDicom(byteArray)
    
    const rows = dataSet.uint16('x00280010') || 512
    const columns = dataSet.uint16('x00280011') || 512
    const bitsAllocated = dataSet.uint16('x00280100') || 16
    const intercept = dataSet.floatString('x00281052') || 0
    const slope = dataSet.floatString('x00281053') || 1

    const pixelElement = dataSet.elements['x7fe00010'] as any
    if (!pixelElement) {
      throw new Error('未找到像素数据')
    }

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

    slices = [{
      pixels: huData,
      rows,
      columns
    }]

    metadata.value = {
      fileName: file.name,
      fileSize: file.size,
      width: columns,
      height: rows,
      sliceCount: 1,
      patientName: dataSet.string('x00100010'),
      studyDate: dataSet.string('x00080020'),
      modality: dataSet.string('x00080060'),
      isDicom: true
    }

    emit('loaded', metadata.value)
    initThreeJS()
    createVolumeFromSlices()
  } catch (error) {
    throw new Error('DICOM解析失败: ' + (error as Error).message)
  }
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

function initThreeJS() {
  if (!containerRef.value) return

  destroyThreeJS()

  const width = props.width
  const height = props.height

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0a0a)

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
  camera.position.set(0, 0, 150)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  containerRef.value.appendChild(renderer.domElement)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(1, 1, 1)
  scene.add(directionalLight)

  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5)
  directionalLight2.position.set(-1, -1, -1)
  scene.add(directionalLight2)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  animate()
}

function animate() {
  animationId = requestAnimationFrame(animate)
  
  if (controls) {
    controls.update()
  }
  
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

function createVolumeFromSlices() {
  if (!scene || slices.length === 0) return

  if (mesh) {
    scene.remove(mesh)
    mesh.geometry.dispose()
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(m => m.dispose())
    } else {
      mesh.material.dispose()
    }
    mesh = null
  }

  const slice = slices[0]
  const rows = slice.rows
  const columns = slice.columns
  
  const geometry = new THREE.BoxGeometry(columns / 10, rows / 10, 50)
  
  const material = new THREE.MeshPhongMaterial({
    color: 0xe94560,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide
  })

  mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)
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

function destroyThreeJS() {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  
  if (controls) {
    controls.dispose()
    controls = null
  }
  
  if (renderer) {
    renderer.dispose()
    if (containerRef.value && renderer.domElement) {
      containerRef.value.removeChild(renderer.domElement)
    }
    renderer = null
  }
  
  if (scene) {
    scene.clear()
    scene = null
  }
  
  camera = null
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

onBeforeUnmount(() => {
  destroyThreeJS()
})
</script>

<template>
  <div class="lung-3d-viewer">
    <div class="viewer-toolbar">
      <div class="toolbar-left">
        <button class="toolbar-btn" @click="openFileDialog" :disabled="isLoading">
          {{ isLoading ? '加载中...' : '选择文件' }}
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".dcm,image/png,image/jpeg"
          style="display: none"
          @change="handleFileSelect"
        />
      </div>
      
      <div class="toolbar-right" v-if="currentFile">
        <span class="file-type-badge">
          {{ metadata?.isDicom ? 'DICOM' : '图片' }}
        </span>
      </div>
    </div>
    
    <div class="viewer-content">
      <div 
        ref="containerRef"
        class="viewer-container"
        :style="{ width: props.width + 'px', height: props.height + 'px' }"
        @drop="handleDrop"
        @dragover="handleDragOver"
      >
        <div v-if="!currentFile" class="upload-hint">
          <div class="hint-content">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <p>拖拽DICOM文件或图片到此处</p>
            <p class="hint-formats">支持 DICOM(.dcm) 和 PNG/JPG</p>
          </div>
        </div>
        
        <div v-if="isLoading" class="loading-overlay">
          <div class="spinner"></div>
          <p>正在加载... {{ progress }}%</p>
        </div>
      </div>
    </div>
    
    <div class="controls-hint" v-if="currentFile">
      <p>🖱️ 左键旋转 | 右键平移 | 滚轮缩放</p>
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
        <div class="info-card">
          <span class="info-label">切片数量</span>
          <span class="info-value">{{ metadata.sliceCount }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lung-3d-viewer {
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
  background: #8b5cf6;
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
}

.viewer-content {
  display: flex;
  justify-content: center;
}

.viewer-container {
  position: relative;
  background: #0a0a0a;
  border-radius: 6px;
  overflow: hidden;
}

.viewer-container canvas {
  display: block;
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

.controls-hint {
  padding: 12px;
  background: #16213e;
  border-radius: 6px;
  text-align: center;
}

.controls-hint p {
  margin: 0;
  color: #888;
  font-size: 13px;
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
