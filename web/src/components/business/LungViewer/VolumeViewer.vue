<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { parseDicomFile, type DicomMetadata, type DicomData } from '../LungViewer/dicomUtils'

interface Props {
  width?: number
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  width: 512,
  height: 512
})

const emit = defineEmits<{
  (e: 'loaded', metadata: DicomMetadata): void
  (e: 'error', error: Error): void
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const isLoading = ref(false)
const currentFile = ref<File | null>(null)
const metadata = ref<DicomMetadata | null>(null)

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let mesh: THREE.Mesh | null = null
let animationId: number | null = null

const opacity = ref(0.5)

function initThreeJS() {
  if (!containerRef.value) return

  const width = props.width
  const height = props.height

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0a0a)

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
  camera.position.z = 3

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  containerRef.value.appendChild(renderer.domElement)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
  directionalLight.position.set(1, 1, 1)
  scene.add(directionalLight)

  animate()
}

function animate() {
  if (!renderer || !scene || !camera) return

  animationId = requestAnimationFrame(animate)
  renderer.render(scene, camera)
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  isLoading.value = true
  currentFile.value = files[0]

  try {
    const data = await parseDicomFile(files[0])
    metadata.value = data.metadata
    emit('loaded', data.metadata)

    createVolumeMesh(data)
  } catch (error) {
    console.error('Failed to parse DICOM:', error)
    emit('error', error as Error)
  } finally {
    isLoading.value = false
  }
}

function createVolumeMesh(_data: DicomData) {
  if (!scene) return

  if (mesh) {
    scene.remove(mesh)
    mesh.geometry.dispose()
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(m => m.dispose())
    } else {
      mesh.material.dispose()
    }
  }

  const geometry = new THREE.BoxGeometry(2, 2, 2)

  const material = new THREE.MeshBasicMaterial({
    color: 0xe94560,
    transparent: true,
    opacity: opacity.value,
    wireframe: false
  })

  mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    if (file.type === 'application/dicom' || file.name.toLowerCase().endsWith('.dcm')) {
      const dt = new DataTransfer()
      dt.items.add(file)
      if (fileInputRef.value) {
        fileInputRef.value.files = dt.files
        const fakeEvent = { target: fileInputRef.value } as any
        handleFileSelect(fakeEvent)
      }
    }
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
}

function openFileDialog() {
  fileInputRef.value?.click()
}

function rotateMesh(direction: 'left' | 'right') {
  if (!mesh) return
  if (direction === 'left') {
    mesh.rotation.y += 0.1
  } else {
    mesh.rotation.y -= 0.1
  }
}

function adjustOpacity(delta: number) {
  opacity.value = Math.max(0.1, Math.min(1, opacity.value + delta))
  if (mesh) {
    (mesh.material as THREE.MeshBasicMaterial).opacity = opacity.value
  }
}

onMounted(() => {
  initThreeJS()
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  if (renderer) {
    renderer.dispose()
    if (containerRef.value && renderer.domElement) {
      containerRef.value.removeChild(renderer.domElement)
    }
  }
})
</script>

<template>
  <div class="volume-viewer">
    <div class="viewer-toolbar">
      <div class="toolbar-left">
        <button class="toolbar-btn" @click="openFileDialog" :disabled="isLoading">
          {{ isLoading ? '加载中...' : '选择DICOM文件' }}
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".dcm,application/dicom"
          style="display: none"
          @change="handleFileSelect"
        />
      </div>
      
      <div class="toolbar-center" v-if="metadata">
        <button class="toolbar-btn" @click="rotateMesh('left')">
          左转
        </button>
        <button class="toolbar-btn" @click="rotateMesh('right')">
          右转
        </button>
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
            <p>拖拽DICOM文件到此处查看3D视图</p>
            <p class="hint-formats">支持 .dcm 格式</p>
          </div>
        </div>
        
        <div v-if="isLoading" class="loading-overlay">
          <div class="spinner"></div>
          <p>正在解析DICOM文件...</p>
        </div>
      </div>
      
      <div class="viewer-controls" v-if="metadata">
        <div class="control-group">
          <label>透明度: {{ opacity.toFixed(1) }}</label>
          <input 
            type="range" 
            :value="opacity" 
            min="0.1" 
            max="1" 
            step="0.1"
            @input="(e) => adjustOpacity(Number((e.target as HTMLInputElement).value) - opacity)"
          />
        </div>
      </div>
    </div>
    
    <div class="viewer-info" v-if="metadata">
      <div class="info-item">
        <span class="info-label">患者:</span>
        <span class="info-value">{{ metadata.patientName || '未知' }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">检查日期:</span>
        <span class="info-value">{{ metadata.studyDate || '未知' }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">影像类型:</span>
        <span class="info-value">{{ metadata.modality || '未知' }}</span>
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
  transition: all 0.2s;
  font-size: 14px;
  margin-right: 8px;
}

.toolbar-btn:last-child {
  margin-right: 0;
}

.toolbar-btn:hover:not(:disabled) {
  background: #1a4a7a;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.viewer-controls {
  width: 200px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: #16213e;
  border-radius: 6px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.control-group label {
  font-size: 12px;
  color: #888;
}

.control-group input[type="range"] {
  width: 100%;
}

.viewer-info {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px;
  background: #16213e;
  border-radius: 6px;
}

.info-item {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.info-label {
  color: #888;
}

.info-value {
  color: #fff;
}
</style>
