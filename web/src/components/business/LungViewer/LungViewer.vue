<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import { useDicomLoader } from './composables/useDicomLoader'
import { useVolumeBuilder } from './composables/useVolumeBuilder'
import { useMPR, type ORIENTATION } from './composables/useMPR'
import { useNoduleDetection } from './composables/useNoduleDetection'
import { useMeasurement } from './composables/useMeasurement'
import { useLungSegmentation } from './composables/useLungSegmentation'
import { SyntheticDataGenerator } from './utils/syntheticData'
import Viewport2D from './ui/Viewport2D.vue'
import VolumeViewer3D from './ui/VolumeViewer3D.vue'
import Toolbar, { type ViewMode } from './ui/Toolbar.vue'
import NoduleList from './ui/NoduleList.vue'
import MeasurementPanel from './ui/MeasurementPanel.vue'
import SliceSlider from './ui/SliceSlider.vue'
import WindowLevel from './ui/WindowLevel.vue'
import { WINDOW_LEVEL_PRESETS } from './types'

const dicomLoader = useDicomLoader()
const volumeBuilder = useVolumeBuilder()
const mpr = useMPR()
const noduleDetection = useNoduleDetection()
const measurement = useMeasurement()
const lungSegmentation = useLungSegmentation()
const syntheticGenerator = new SyntheticDataGenerator(64, 64, 64)

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

const viewMode = ref<ViewMode>('mpr')
const layout = ref<'single' | 'dual' | 'quad'>('quad')
const showBronchi = ref(true)
const showLobes = ref(true)
const showNodules = ref(true)
const activePanel = ref<'nodules' | 'measurements' | null>('nodules')

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
    f.name.toLowerCase().endsWith('.dcm') || f.type === 'application/dicom'
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
    let series
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

    if (volumeBuffer) {
      lungSegmentation.initialize(volumeBuffer)
      lungSegmentation.segmentLungs()
      lungSegmentation.extractAirways()
    }
  } catch (error) {
    console.error('Failed to load DICOM files:', error)
  }
}

function loadSyntheticData() {
  try {
    const syntheticData = syntheticGenerator.generate()
    const volumeBuffer = volumeBuilder.buildVolumeFromSynthetic(syntheticData)
    mpr.setVolumeBuffer(volumeBuffer)

    if (volumeBuffer) {
      lungSegmentation.initialize(volumeBuffer)
      lungSegmentation.segmentLungs()
      lungSegmentation.extractAirways()
    }
  } catch (error) {
    console.error('Failed to load synthetic data:', error)
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

function handlePresetSelect(index: number) {
  const preset = WINDOW_LEVEL_PRESETS[index]
  if (preset) {
    mpr.setPreset(preset)
  }
}

function handleViewportClick(orientation: ORIENTATION, imageCoords: { x: number; y: number }) {
  mpr.updateCrosshair(orientation, imageCoords.x, imageCoords.y)
}

function handleNoduleSelect(id: string) {
  noduleDetection.selectNodule(id)
}

function handleNoduleRemove(id: string) {
  noduleDetection.removeNodule(id)
}

function handleNoduleToggleVisibility(id: string) {
  noduleDetection.toggleNoduleVisibility(id)
}

function handleNoduleConfirm(id: string) {
  noduleDetection.confirmNodule(id)
}

function handleMeasurementSelect(id: string) {
  measurement.selectMeasurement(id)
}

function handleMeasurementRemove(id: string) {
  measurement.removeMeasurement(id)
}

function handleMeasurementToggleVisibility(id: string) {
  measurement.toggleMeasurementVisibility(id)
}

function handleMeasurementClearAll() {
  measurement.clearAll()
}

function handleMeasurementToolChange(tool: 'select' | 'distance' | 'angle' | 'ctvalue') {
  measurement.setActiveTool(tool)
}

function handleReset() {
  mpr.resetView()
  noduleDetection.clearAll()
  measurement.clearAll()
}

provide('mpr', mpr)
provide('dicomLoader', dicomLoader)
provide('volumeBuilder', volumeBuilder)
provide('noduleDetection', noduleDetection)
provide('measurement', measurement)
</script>

<template>
  <div class="lung-viewer">
    <Toolbar
      :active-view="viewMode"
      :active-tool="measurement.activeTool.value"
      :show-bronchi="showBronchi"
      :show-lobes="showLobes"
      :show-nodules="showNodules"
      :layout="layout"
      @view-change="(v) => viewMode = v"
      @tool-change="(t) => measurement.setActiveTool(t)"
      @toggle-bronchi="showBronchi = !showBronchi"
      @toggle-lobes="showLobes = !showLobes"
      @toggle-nodules="showNodules = !showNodules"
      @layout-change="(l) => layout = l"
      @reset="handleReset"
    />

    <div v-if="!hasData" class="upload-area" :class="{ dragover: isDragOver }" @drop="handleDrop" @dragover="handleDragOver" @dragleave="handleDragLeave" @click="openFileDialog">
      <div class="upload-content">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
        <h2>拖拽 DICOM 文件到这里</h2>
        <p>或点击选择文件 · 支持 .dcm, DICOM 格式</p>
        <button class="test-data-btn" @click.stop="loadSyntheticData">加载测试数据</button>
      </div>
      <input ref="fileInputRef" type="file" accept=".dcm,image/dicom,application/dicom" multiple style="display: none" @change="handleFileSelect" />
    </div>

    <div v-else class="viewer-content">
      <div class="sidebar">
        <div class="sidebar-tabs">
          <button :class="{ active: activePanel === 'nodules' }" @click="activePanel = 'nodules'">
            结节 ({{ noduleDetection.summary.value.total }})
          </button>
          <button :class="{ active: activePanel === 'measurements' }" @click="activePanel = 'measurements'">
            测量 ({{ measurement.measurementCount.value.total }})
          </button>
        </div>

        <div v-if="activePanel === 'nodules'" class="panel-content">
          <NoduleList
            :nodules="noduleDetection.nodules.value"
            :selected-id="noduleDetection.selectedNoduleId.value"
            @select="handleNoduleSelect"
            @remove="handleNoduleRemove"
            @toggle-visibility="handleNoduleToggleVisibility"
            @confirm="handleNoduleConfirm"
          />
        </div>

        <div v-if="activePanel === 'measurements'" class="panel-content">
          <MeasurementPanel
            :measurements="measurement.measurements.value"
            :active-tool="measurement.activeTool.value"
            :show-labels="measurement.showLabels.value"
            :show-values="measurement.showValues.value"
            @select="handleMeasurementSelect"
            @remove="handleMeasurementRemove"
            @toggle-visibility="handleMeasurementToggleVisibility"
            @clear-all="handleMeasurementClearAll"
            @tool-change="handleMeasurementToolChange"
            @toggle-labels="measurement.toggleAllLabels"
            @toggle-values="measurement.toggleAllValues"
          />
        </div>
      </div>

      <main class="viewport-container" :class="layout">
        <template v-if="viewMode === 'mpr' || viewMode === 'compare'">
          <div v-if="layout === 'single' || layout === 'quad'" class="viewport-wrapper">
            <Viewport2D
              :image-data="mpr.axialImageData.value"
              orientation="axial"
              :slice-index="mpr.axialSliceIndex.value"
              :total-slices="mpr.axialTotalSlices.value"
              :window-center="mpr.windowCenter.value"
              :window-width="mpr.windowWidth.value"
              :zoom="mpr.zoom.value"
              :pan="mpr.pan.value"
              :crosshair-position="mpr.crosshair.value.axial"
              :active="mpr.activeViewport.value === 'axial'"
              @slice-change="(v) => handleSliceChange('axial', v)"
              @window-level-change="handleWindowLevelChange"
              @zoom="(v) => mpr.setZoom(v)"
              @pan="(v) => mpr.setPan(v)"
              @click="(_, coords) => handleViewportClick('axial', coords)"
            />
          </div>

          <div v-if="layout === 'dual' || layout === 'quad'" class="viewport-wrapper">
            <Viewport2D
              :image-data="mpr.coronalImageData.value"
              orientation="coronal"
              :slice-index="mpr.coronalSliceIndex.value"
              :total-slices="mpr.coronalTotalSlices.value"
              :window-center="mpr.windowCenter.value"
              :window-width="mpr.windowWidth.value"
              :zoom="mpr.zoom.value"
              :pan="mpr.pan.value"
              :crosshair-position="mpr.crosshair.value.coronal"
              :active="mpr.activeViewport.value === 'coronal'"
              @slice-change="(v) => handleSliceChange('coronal', v)"
              @window-level-change="handleWindowLevelChange"
              @zoom="(v) => mpr.setZoom(v)"
              @pan="(v) => mpr.setPan(v)"
              @click="(_, coords) => handleViewportClick('coronal', coords)"
            />
          </div>

          <div v-if="layout === 'quad'" class="viewport-wrapper">
            <Viewport2D
              :image-data="mpr.sagittalImageData.value"
              orientation="sagittal"
              :slice-index="mpr.sagittalSliceIndex.value"
              :total-slices="mpr.sagittalTotalSlices.value"
              :window-center="mpr.windowCenter.value"
              :window-width="mpr.windowWidth.value"
              :zoom="mpr.zoom.value"
              :pan="mpr.pan.value"
              :crosshair-position="mpr.crosshair.value.sagittal"
              :active="mpr.activeViewport.value === 'sagittal'"
              @slice-change="(v) => handleSliceChange('sagittal', v)"
              @window-level-change="handleWindowLevelChange"
              @zoom="(v) => mpr.setZoom(v)"
              @pan="(v) => mpr.setPan(v)"
              @click="(_, coords) => handleViewportClick('sagittal', coords)"
            />
          </div>
        </template>

        <template v-if="viewMode === '3d'">
          <div class="viewport-wrapper full">
            <VolumeViewer3D :volume-buffer="volumeBuilder.volumeBuffer.value" />
          </div>
        </template>
      </main>

      <aside class="controls-panel">
        <div class="panel-section">
          <h3>切片导航</h3>
          <div class="slice-controls">
            <div class="slice-control">
              <label>轴状位</label>
              <SliceSlider
                :value="mpr.axialSliceIndex.value"
                :min="0"
                :max="mpr.axialTotalSlices.value - 1"
                @input="(v) => handleSliceChange('axial', v)"
              />
            </div>
            <div class="slice-control">
              <label>冠状位</label>
              <SliceSlider
                :value="mpr.coronalSliceIndex.value"
                :min="0"
                :max="mpr.coronalTotalSlices.value - 1"
                @input="(v) => handleSliceChange('coronal', v)"
              />
            </div>
            <div class="slice-control">
              <label>矢状位</label>
              <SliceSlider
                :value="mpr.sagittalSliceIndex.value"
                :min="0"
                :max="mpr.sagittalTotalSlices.value - 1"
                @input="(v) => handleSliceChange('sagittal', v)"
              />
            </div>
          </div>
        </div>

        <div class="panel-section">
          <h3>窗宽窗位</h3>
          <WindowLevel
            :window-center="mpr.windowCenter.value"
            :window-width="mpr.windowWidth.value"
            @update="handleWindowLevelChange"
          />
          <div class="preset-buttons">
            <button
              v-for="(preset, index) in WINDOW_LEVEL_PRESETS"
              :key="preset.name"
              class="preset-btn"
              :class="{ active: mpr.currentPreset.value?.name === preset.name }"
              @click="handlePresetSelect(index)"
            >
              {{ preset.name }}
            </button>
          </div>
        </div>
      </aside>
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
.lung-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-primary, #0f172a);
  color: var(--color-text-primary, #fff);
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

.test-data-btn {
  margin-top: 16px;
  padding: 10px 24px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 8px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.test-data-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.viewer-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 300px;
  background: rgba(30, 41, 59, 0.5);
  border-right: 1px solid rgba(99, 102, 241, 0.2);
  display: flex;
  flex-direction: column;
}

.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid rgba(99, 102, 241, 0.2);
}

.sidebar-tabs button {
  flex: 1;
  padding: 12px;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.sidebar-tabs button.active {
  background: rgba(99, 102, 241, 0.1);
  color: #818cf8;
  border-bottom: 2px solid #818cf8;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
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

.viewport-wrapper.full {
  grid-column: 1 / -1;
  grid-row: 1 / -1;
}

.controls-panel {
  width: 260px;
  padding: 16px;
  background: rgba(30, 41, 59, 0.5);
  border-left: 1px solid rgba(99, 102, 241, 0.2);
  overflow-y: auto;
}

.panel-section {
  margin-bottom: 24px;
}

.panel-section h3 {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: #94a3b8;
  margin: 0 0 12px 0;
}

.slice-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.preset-btn {
  padding: 4px 10px;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 16px;
  color: #94a3b8;
  font-size: 11px;
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
