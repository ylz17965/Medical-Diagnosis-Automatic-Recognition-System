<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import { useMPR, type ORIENTATION } from './composables/useMPR'
import { useDicomLoader } from './composables/useDicomLoader'
import { useVolumeBuilder } from './composables/useVolumeBuilder'
import Viewport2D from './ui/Viewport2D.vue'
import SliceSlider from './ui/SliceSlider.vue'
import WindowLevel from './ui/WindowLevel.vue'
import type { DicomSeries } from './types'
import { WINDOW_LEVEL_PRESETS } from './types'

const dicomLoader = useDicomLoader()
const volumeBuilder = useVolumeBuilder()
const mpr = useMPR()

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

const viewLayout = ref<'single' | 'dual' | 'quad'>('quad')

const axialViewportRef = ref<InstanceType<typeof Viewport2D> | null>(null)
const coronalViewportRef = ref<InstanceType<typeof Viewport2D> | null>(null)
const sagittalViewportRef = ref<InstanceType<typeof Viewport2D> | null>(null)

const hasData = computed(() => mpr.volumeBuffer.value !== null)

const seriesInfo = computed(() => {
  if (!dicomLoader.currentSeries.value) return null
  const series = dicomLoader.currentSeries.value
  return {
    patientName: series.instances[0]?.metadata.patientName || 'Unknown',
    studyDate: series.instances[0]?.metadata.studyDate || '',
    seriesDescription: series.seriesDescription || 'CT Series',
    numberOfSlices: series.numberOfSlices
  }
})

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  await loadFiles(Array.from(files))
  input.value = ''
}

async function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false

  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return

  const dicomFiles = Array.from(files).filter(f =>
    f.name.toLowerCase().endsWith('.dcm') ||
    f.type === 'application/dicom' ||
    f.type.startsWith('image/')
  )

  if (dicomFiles.length > 0) {
    await loadFiles(dicomFiles)
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = true
}

function handleDragLeave() {
  isDragOver.value = false
}

async function loadFiles(files: File[]) {
  try {
    let series: DicomSeries

    if (files.length === 1) {
      const file = await dicomLoader.loadFile(files[0])
      series = {
        seriesInstanceUid: file.metadata.seriesInstanceUid || 'single',
        seriesDescription: file.metadata.seriesDescription || 'CT Image',
        modality: file.metadata.modality,
        seriesNumber: 1,
        instances: [file],
        numberOfSlices: 1
      }
    } else {
      series = await dicomLoader.loadSeries(files)
    }

    const volumeBuffer = await volumeBuilder.buildVolumeFromSeries(series)
    mpr.setVolumeBuffer(volumeBuffer)

  } catch (error) {
    console.error('Failed to load DICOM files:', error)
  }
}

function openFileDialog() {
  fileInputRef.value?.click()
}

function handleSliceChange(orientation: ORIENTATION, index: number) {
  mpr.setSliceIndex(orientation, index)
}

function handleWindowLevelChange(center: number, width: number) {
  mpr.setWindowLevel(center, width)
}

function handleViewportClick(orientation: ORIENTATION, imageCoords: { x: number; y: number }) {
  mpr.updateCrosshair(orientation, imageCoords.x, imageCoords.y)
}

function setPreset(presetIndex: number) {
  const preset = WINDOW_LEVEL_PRESETS[presetIndex]
  if (preset) {
    mpr.setPreset(preset)
  }
}

function resetAllView() {
  mpr.resetView()
}

function setLayout(layout: 'single' | 'dual' | 'quad') {
  viewLayout.value = layout
}

provide('mpr', mpr)
provide('dicomLoader', dicomLoader)
provide('volumeBuilder', volumeBuilder)
</script>

<template>
  <div class="mpr-viewer">
    <header class="viewer-header">
      <h1>多平面重建 (MPR)</h1>
      <div class="header-actions">
        <button class="action-btn" @click="openFileDialog">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17,8 12,3 7,8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          加载影像
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".dcm,image/dicom,application/dicom"
          multiple
          style="display: none"
          @change="handleFileSelect"
        />
      </div>
    </header>

    <div v-if="!hasData" class="upload-area" :class="{ dragover: isDragOver }" @drop="handleDrop" @dragover="handleDragOver" @dragleave="handleDragLeave" @click="openFileDialog">
      <div class="upload-content">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
        <h2>拖拽 DICOM 文件到这里</h2>
        <p>或点击选择文件 · 支持 .dcm, DICOM 格式</p>
        <p class="formats">支持单帧图像和多帧 CT/MR 系列</p>
      </div>
    </div>

    <div v-else class="viewer-content">
      <aside class="sidebar">
        <div class="sidebar-section">
          <h3>布局</h3>
          <div class="layout-buttons">
            <button :class="{ active: viewLayout === 'single' }" @click="setLayout('single')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
              </svg>
            </button>
            <button :class="{ active: viewLayout === 'dual' }" @click="setLayout('dual')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="12" y1="3" x2="12" y2="21" stroke="var(--bg)" stroke-width="2"/>
              </svg>
            </button>
            <button :class="{ active: viewLayout === 'quad' }" @click="setLayout('quad')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="12" y1="3" x2="12" y2="21" stroke="var(--bg)" stroke-width="2"/>
                <line x1="3" y1="12" x2="21" y2="12" stroke="var(--bg)" stroke-width="2"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="sidebar-section">
          <h3>窗宽窗位</h3>
          <div class="preset-buttons">
            <button
              v-for="(preset, index) in WINDOW_LEVEL_PRESETS"
              :key="preset.name"
              class="preset-btn"
              :class="{ active: mpr.currentPreset.value?.name === preset.name }"
              @click="setPreset(index)"
            >
              {{ preset.name }}
            </button>
          </div>
          <div class="window-level-control">
            <WindowLevel
              :window-center="mpr.windowCenter.value"
              :window-width="mpr.windowWidth.value"
              @update="handleWindowLevelChange"
            />
          </div>
        </div>

        <div class="sidebar-section">
          <h3>切片导航</h3>
          <div class="slice-controls">
            <div class="slice-control">
              <label>轴状位 (AX)</label>
              <SliceSlider
                :value="mpr.axialSliceIndex.value"
                :min="0"
                :max="mpr.axialTotalSlices.value - 1"
                @input="(v) => handleSliceChange('axial', v)"
              />
              <span class="slice-value">{{ mpr.axialSliceIndex.value + 1 }} / {{ mpr.axialTotalSlices.value }}</span>
            </div>
            <div class="slice-control">
              <label>冠状位 (COR)</label>
              <SliceSlider
                :value="mpr.coronalSliceIndex.value"
                :min="0"
                :max="mpr.coronalTotalSlices.value - 1"
                @input="(v) => handleSliceChange('coronal', v)"
              />
              <span class="slice-value">{{ mpr.coronalSliceIndex.value + 1 }} / {{ mpr.coronalTotalSlices.value }}</span>
            </div>
            <div class="slice-control">
              <label>矢状位 (SAG)</label>
              <SliceSlider
                :value="mpr.sagittalSliceIndex.value"
                :min="0"
                :max="mpr.sagittalTotalSlices.value - 1"
                @input="(v) => handleSliceChange('sagittal', v)"
              />
              <span class="slice-value">{{ mpr.sagittalSliceIndex.value + 1 }} / {{ mpr.sagittalTotalSlices.value }}</span>
            </div>
          </div>
        </div>

        <div class="sidebar-section">
          <button class="reset-btn" @click="resetAllView">重置视图</button>
        </div>
      </aside>

      <main class="viewport-container" :class="viewLayout">
        <div v-if="viewLayout === 'single' || viewLayout === 'quad'" class="viewport-wrapper">
          <Viewport2D
            ref="axialViewportRef"
            :image-data="mpr.axialImageData.value"
            orientation="axial"
            :slice-index="mpr.axialSliceIndex.value"
            :total-slices="mpr.axialTotalSlices.value"
            :window-center="mpr.windowCenter.value"
            :window-width="mpr.windowWidth.value"
            :zoom="mpr.zoom.value"
            :pan="mpr.pan.value"
            :crosshair-position="mpr.crosshair.value.axial"
            :show-crosshair="true"
            :active="mpr.activeViewport.value === 'axial'"
            @slice-change="(v) => handleSliceChange('axial', v)"
            @window-level-change="handleWindowLevelChange"
            @zoom="(v) => mpr.setZoom(v)"
            @pan="(v) => mpr.setPan(v)"
            @click="(_, coords) => handleViewportClick('axial', coords)"
          />
        </div>

        <div v-if="viewLayout === 'dual' || viewLayout === 'quad'" class="viewport-wrapper">
          <Viewport2D
            ref="coronalViewportRef"
            :image-data="mpr.coronalImageData.value"
            orientation="coronal"
            :slice-index="mpr.coronalSliceIndex.value"
            :total-slices="mpr.coronalTotalSlices.value"
            :window-center="mpr.windowCenter.value"
            :window-width="mpr.windowWidth.value"
            :zoom="mpr.zoom.value"
            :pan="mpr.pan.value"
            :crosshair-position="mpr.crosshair.value.coronal"
            :show-crosshair="true"
            :active="mpr.activeViewport.value === 'coronal'"
            @slice-change="(v) => handleSliceChange('coronal', v)"
            @window-level-change="handleWindowLevelChange"
            @zoom="(v) => mpr.setZoom(v)"
            @pan="(v) => mpr.setPan(v)"
            @click="(_, coords) => handleViewportClick('coronal', coords)"
          />
        </div>

        <div v-if="viewLayout === 'quad'" class="viewport-wrapper">
          <Viewport2D
            ref="sagittalViewportRef"
            :image-data="mpr.sagittalImageData.value"
            orientation="sagittal"
            :slice-index="mpr.sagittalSliceIndex.value"
            :total-slices="mpr.sagittalTotalSlices.value"
            :window-center="mpr.windowCenter.value"
            :window-width="mpr.windowWidth.value"
            :zoom="mpr.zoom.value"
            :pan="mpr.pan.value"
            :crosshair-position="mpr.crosshair.value.sagittal"
            :show-crosshair="true"
            :active="mpr.activeViewport.value === 'sagittal'"
            @slice-change="(v) => handleSliceChange('sagittal', v)"
            @window-level-change="handleWindowLevelChange"
            @zoom="(v) => mpr.setZoom(v)"
            @pan="(v) => mpr.setPan(v)"
            @click="(_, coords) => handleViewportClick('sagittal', coords)"
          />
        </div>
      </main>
    </div>

    <div v-if="seriesInfo" class="series-info">
      <span>{{ seriesInfo.patientName }}</span>
      <span>{{ seriesInfo.studyDate }}</span>
      <span>{{ seriesInfo.seriesDescription }}</span>
      <span>{{ seriesInfo.numberOfSlices }} 层</span>
    </div>
  </div>
</template>

<style scoped>
.mpr-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-primary, #0f172a);
  color: var(--color-text-primary, #fff);
}

.viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: rgba(30, 41, 59, 0.8);
  border-bottom: 1px solid rgba(99, 102, 241, 0.2);
}

.viewer-header h1 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  background: linear-gradient(90deg, #818cf8, #c084fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.4);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(99, 102, 241, 0.3);
  border-color: #818cf8;
}

.upload-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed rgba(99, 102, 241, 0.3);
  border-radius: 12px;
  margin: 24px;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-area.dragover {
  border-color: #818cf8;
  background: rgba(99, 102, 241, 0.1);
}

.upload-content {
  text-align: center;
  color: #94a3b8;
}

.upload-content svg {
  margin-bottom: 16px;
  color: #636366;
}

.upload-content h2 {
  font-size: 20px;
  margin: 0 0 8px 0;
  color: #e2e8f0;
}

.upload-content p {
  margin: 8px 0;
  font-size: 14px;
}

.upload-content .formats {
  font-size: 12px;
  color: #636366;
  margin-top: 16px;
}

.viewer-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 280px;
  padding: 16px;
  background: rgba(30, 41, 59, 0.5);
  border-right: 1px solid rgba(99, 102, 241, 0.2);
  overflow-y: auto;
}

.sidebar-section {
  margin-bottom: 24px;
}

.sidebar-section h3 {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: #94a3b8;
  margin: 0 0 12px 0;
}

.layout-buttons {
  display: flex;
  gap: 8px;
}

.layout-buttons button {
  flex: 1;
  padding: 8px;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 6px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
}

.layout-buttons button:hover {
  background: rgba(99, 102, 241, 0.1);
}

.layout-buttons button.active {
  background: rgba(99, 102, 241, 0.2);
  border-color: #818cf8;
  color: #e2e8f0;
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.preset-btn {
  padding: 4px 12px;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 16px;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: rgba(99, 102, 241, 0.1);
}

.preset-btn.active {
  background: rgba(99, 102, 241, 0.2);
  border-color: #818cf8;
  color: #e2e8f0;
}

.window-level-control {
  margin-top: 12px;
}

.slice-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.slice-control {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.slice-control label {
  font-size: 11px;
  color: #94a3b8;
}

.slice-value {
  font-size: 11px;
  color: #636366;
  text-align: right;
  font-family: monospace;
}

.reset-btn {
  width: 100%;
  padding: 10px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #f87171;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.viewport-container {
  flex: 1;
  display: grid;
  gap: 8px;
  padding: 16px;
  overflow: auto;
}

.viewport-container.single {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
}

.viewport-container.dual {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr;
}

.viewport-container.quad {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
}

.viewport-wrapper {
  min-width: 0;
  min-height: 0;
}

.series-info {
  display: flex;
  gap: 24px;
  padding: 8px 24px;
  background: rgba(30, 41, 59, 0.8);
  border-top: 1px solid rgba(99, 102, 241, 0.2);
  font-size: 12px;
  color: #94a3b8;
}

.series-info span {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
