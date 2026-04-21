<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { VTKVolumeRenderer } from './core/VTKVolumeRenderer'
import { segmentationFactory, type SegmentationMethod } from './core/SegmentationFactory'
import { loadVolumeFiles, type VolumeLoadResult, type LoadProgress, getSupportedFormats } from './utils/VolumeLoader'
import type { SegmentedLungs } from './types/segmentation'
import createLogger from '@/utils/logger'

const log = createLogger('SegmentationTest')

const containerRef = ref<HTMLDivElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const isLoading = ref(false)
const isSegmenting = ref(false)
const loadProgress = ref<LoadProgress | null>(null)
const segmentationProgress = ref(0)
const segmentationStage = ref('')

const volumeInfo = ref<VolumeLoadResult | null>(null)
const segmentationResult = ref<SegmentedLungs | null>(null)

const segmentationMethod = ref<SegmentationMethod>('auto')
const currentSlice = ref(0)
const windowPreset = ref<'lung' | 'mediastinal' | 'bone'>('lung')

const inferenceTime = ref(0)
const capabilities = ref<{
  deepLearning: boolean
  webGPU: boolean
  webAssembly: boolean
} | null>(null)

let renderer: VTKVolumeRenderer | null = null

const supportedFormats = getSupportedFormats()

const sliceRange = computed(() => {
  if (!volumeInfo.value) return { min: 0, max: 0 }
  return { min: 0, max: volumeInfo.value.dimensions[2] - 1 }
})

const statsText = computed(() => {
  if (!volumeInfo.value) return ''
  const { dimensions, scalarRange, spacing } = volumeInfo.value
  return `尺寸: ${dimensions[0]}×${dimensions[1]}×${dimensions[2]} | ` +
         `HU范围: ${scalarRange[0].toFixed(0)} ~ ${scalarRange[1].toFixed(0)} | ` +
         `间距: ${spacing[0].toFixed(2)}×${spacing[1].toFixed(2)}×${spacing[2].toFixed(2)}mm`
})

const segmentationStatsText = computed(() => {
  if (!segmentationResult.value) return ''
  const left = segmentationResult.value.leftLungBounds
  const right = segmentationResult.value.rightLungBounds
  return `左肺: ${left.max.x - left.min.x}×${left.max.y - left.min.y}×${left.max.z - left.min.z} | ` +
         `右肺: ${right.max.x - right.min.x}×${right.max.y - right.min.y}×${right.max.z - right.min.z} | ` +
         `推理时间: ${inferenceTime.value.toFixed(0)}ms`
})

onMounted(async () => {
  if (containerRef.value) {
    renderer = new VTKVolumeRenderer(containerRef.value)
  }
  
  capabilities.value = await segmentationFactory.checkCapabilities()
  log.info('Capabilities', capabilities.value)
})

onUnmounted(() => {
  renderer?.dispose()
})

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  isLoading.value = true
  loadProgress.value = null
  volumeInfo.value = null
  segmentationResult.value = null

  try {
    const result = await loadVolumeFiles(input.files, (progress) => {
      loadProgress.value = progress
    })

    volumeInfo.value = result
    currentSlice.value = Math.floor(result.dimensions[2] / 2)

    renderer?.setInputData(result.imageData, false)
    renderer?.setWindowPreset(windowPreset.value)

    log.info('Volume loaded', { 
      format: result.format,
      dimensions: result.dimensions,
      scalarRange: result.scalarRange 
    })
  } catch (error) {
    log.error('Failed to load volume', { error })
    alert(`加载失败: ${error}`)
  } finally {
    isLoading.value = false
    loadProgress.value = null
  }
}

async function runSegmentation() {
  if (!volumeInfo.value) return

  isSegmenting.value = true
  segmentationProgress.value = 0
  segmentationStage.value = '初始化'

  const startTime = performance.now()

  try {
    const segmentation = await segmentationFactory.createSegmentation({
      method: segmentationMethod.value,
      onProgress: (progress, stage) => {
        segmentationProgress.value = progress
        segmentationStage.value = stage
      },
    })

    const scalars = volumeInfo.value.imageData.getPointData().getScalars()
    const volumeData = scalars.getData() as Float32Array
    const dimensions = volumeInfo.value.dimensions

    segmentationResult.value = await segmentation.segment(volumeData, dimensions)

    inferenceTime.value = performance.now() - startTime

    log.info('Segmentation completed', {
      inferenceTime: inferenceTime.value,
      method: segmentation.getMethod(),
    })
  } catch (error) {
    log.error('Segmentation failed', { error })
    alert(`分割失败: ${error}`)
  } finally {
    isSegmenting.value = false
    segmentationStage.value = ''
  }
}

function updateWindowPreset(preset: 'lung' | 'mediastinal' | 'bone') {
  windowPreset.value = preset
  renderer?.setWindowPreset(preset)
}

function updateSlice(value: number) {
  currentSlice.value = value
}

function clearFiles() {
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
  volumeInfo.value = null
  segmentationResult.value = null
  renderer?.dispose()
  if (containerRef.value) {
    renderer = new VTKVolumeRenderer(containerRef.value)
  }
}
</script>

<template>
  <div class="segmentation-test">
    <div class="toolbar">
      <div class="toolbar-left">
        <label class="file-input-wrapper">
          <input
            ref="fileInputRef"
            type="file"
            multiple
            accept=".dcm,.mhd,.mha,.raw,.zraw"
            @change="handleFileSelect"
          />
          <span class="file-input-btn">📁 选择文件</span>
        </label>

        <button
          class="btn btn-primary"
          :disabled="!volumeInfo || isSegmenting"
          @click="runSegmentation"
        >
          {{ isSegmenting ? `分割中... ${segmentationProgress.toFixed(0)}%` : '🫁 开始分割' }}
        </button>

        <button
          class="btn btn-secondary"
          :disabled="!volumeInfo"
          @click="clearFiles"
        >
          🗑️ 清除
        </button>
      </div>

      <div class="toolbar-right">
        <select v-model="segmentationMethod" class="select-input">
          <option value="auto">自动选择</option>
          <option value="deep_learning">深度学习</option>
          <option value="threshold">阈值分割</option>
        </select>

        <div class="window-presets">
          <button
            v-for="preset in ['lung', 'mediastinal', 'bone'] as const"
            :key="preset"
            :class="['preset-btn', { active: windowPreset === preset }]"
            @click="updateWindowPreset(preset)"
          >
            {{ preset === 'lung' ? '肺窗' : preset === 'mediastinal' ? '纵隔窗' : '骨窗' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="capabilities" class="capabilities-bar">
      <span :class="['capability', { enabled: capabilities.webGPU }]">
        WebGPU: {{ capabilities.webGPU ? '✅' : '❌' }}
      </span>
      <span :class="['capability', { enabled: capabilities.webAssembly }]">
        WASM: {{ capabilities.webAssembly ? '✅' : '❌' }}
      </span>
      <span :class="['capability', { enabled: capabilities.deepLearning }]">
        深度学习: {{ capabilities.deepLearning ? '✅' : '❌' }}
      </span>
    </div>

    <div v-if="isLoading && loadProgress" class="loading-overlay">
      <div class="loading-content">
        <div class="spinner"></div>
        <p>{{ loadProgress.message }}</p>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: loadProgress.progress + '%' }"></div>
        </div>
      </div>
    </div>

    <div class="main-content">
      <div ref="containerRef" class="viewer-container"></div>

      <div v-if="volumeInfo" class="side-panel">
        <div class="panel-section">
          <h3>📊 体数据信息</h3>
          <p class="info-text">{{ statsText }}</p>
        </div>

        <div class="panel-section">
          <h3>🔪 切片控制</h3>
          <div class="slice-control">
            <input
              type="range"
              :min="sliceRange.min"
              :max="sliceRange.max"
              :value="currentSlice"
              @input="updateSlice(($event.target as HTMLInputElement).valueAsNumber)"
            />
            <span>{{ currentSlice }} / {{ sliceRange.max }}</span>
          </div>
        </div>

        <div v-if="segmentationResult" class="panel-section">
          <h3>🫁 分割结果</h3>
          <p class="info-text">{{ segmentationStatsText }}</p>
        </div>

        <div class="panel-section">
          <h3>📝 支持格式</h3>
          <ul class="format-list">
            <li v-for="format in supportedFormats" :key="format.extension">
              <code>{{ format.extension }}</code> - {{ format.description }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.segmentation-test {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-secondary);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-input-wrapper input {
  display: none;
}

.file-input-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background: var(--accent-primary);
  color: white;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.file-input-btn:hover {
  background: var(--accent-hover);
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.select-input {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.window-presets {
  display: flex;
  gap: 4px;
}

.preset-btn {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn.active {
  background: var(--accent-primary);
  color: white;
  border-color: var(--accent-primary);
}

.capabilities-bar {
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
}

.capability {
  font-size: 12px;
  color: var(--text-secondary);
}

.capability.enabled {
  color: var(--success-color);
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-content {
  text-align: center;
  color: white;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.progress-bar {
  width: 200px;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 8px;
}

.progress-fill {
  height: 100%;
  background: var(--accent-primary);
  transition: width 0.3s;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.viewer-container {
  flex: 1;
  background: #0a0a0a;
}

.side-panel {
  width: 280px;
  padding: 16px;
  background: var(--bg-primary);
  border-left: 1px solid var(--border-color);
  overflow-y: auto;
}

.panel-section {
  margin-bottom: 20px;
}

.panel-section h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.info-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.slice-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slice-control input[type="range"] {
  flex: 1;
}

.format-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.format-list li {
  font-size: 12px;
  padding: 4px 0;
  color: var(--text-secondary);
}

.format-list code {
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
}
</style>
