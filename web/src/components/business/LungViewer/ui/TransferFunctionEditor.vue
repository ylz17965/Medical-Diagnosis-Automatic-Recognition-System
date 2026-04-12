<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { WINDOW_PRESETS, type WindowLevelPreset } from '../types/segmentation'

interface TransferPoint {
  hu: number
  opacity: number
  color: string
}

const props = defineProps<{
  windowCenter: number
  windowWidth: number
}>()

const emit = defineEmits<{
  (e: 'update', center: number, width: number): void
  (e: 'preset-select', preset: WindowLevelPreset): void
}>()

const presets = WINDOW_PRESETS

const localCenter = ref(props.windowCenter)
const localWidth = ref(props.windowWidth)

watch(() => props.windowCenter, (v) => { localCenter.value = v })
watch(() => props.windowWidth, (v) => { localWidth.value = v })

const minHU = -1024
const maxHU = 3072

const transferPoints = ref<TransferPoint[]>([
  { hu: -1000, opacity: 0, color: '#000000' },
  { hu: -950, opacity: 0, color: '#000000' },
  { hu: -800, opacity: 0.2, color: '#8B4513' },
  { hu: -600, opacity: 0.8, color: '#CD853F' },
  { hu: -400, opacity: 0.6, color: '#DEB887' },
  { hu: -100, opacity: 0.4, color: '#F5DEB3' },
  { hu: 100, opacity: 0.7, color: '#FFA07A' },
  { hu: 300, opacity: 0.9, color: '#FFD700' },
  { hu: 1000, opacity: 1.0, color: '#FFFFFF' }
])

const previewGradient = computed(() => {
  const stops = transferPoints.value
    .map((p) => {
      const pos = ((p.hu - minHU) / (maxHU - minHU)) * 100
      return `${p.color} ${pos}%`
    })
    .join(', ')
  return `linear-gradient(to right, ${stops})`
})

function selectPreset(preset: WindowLevelPreset) {
  localCenter.value = preset.windowCenter
  localWidth.value = preset.windowWidth
  emit('preset-select', preset)
  emit('update', preset.windowCenter, preset.windowWidth)
}

function handleCenterInput(event: Event) {
  const target = event.target as HTMLInputElement
  localCenter.value = parseInt(target.value, 10)
  emit('update', localCenter.value, localWidth.value)
}

function handleWidthInput(event: Event) {
  const target = event.target as HTMLInputElement
  localWidth.value = parseInt(target.value, 10)
  emit('update', localCenter.value, localWidth.value)
}
</script>

<template>
  <div class="transfer-function-editor">
    <div class="editor-section">
      <h4>窗宽窗位</h4>

      <div class="wl-control">
        <label>窗位 (WC): {{ localCenter }} HU</label>
        <input
          type="range"
          :value="localCenter"
          :min="minHU"
          :max="maxHU"
          @input="handleCenterInput"
        />
      </div>

      <div class="wl-control">
        <label>窗宽 (WW): {{ localWidth }} HU</label>
        <input
          type="range"
          :value="localWidth"
          :min="1"
          :max="4000"
          @input="handleWidthInput"
        />
      </div>

      <div class="hu-range">
        <span>{{ localCenter - localWidth / 2 }} HU</span>
        <span>{{ localCenter + localWidth / 2 }} HU</span>
      </div>
    </div>

    <div class="editor-section">
      <h4>预设</h4>
      <div class="preset-buttons">
        <button
          v-for="preset in presets"
          :key="preset.name"
          class="preset-btn"
          :class="{
            active: localCenter === preset.windowCenter && localWidth === preset.windowWidth
          }"
          @click="selectPreset(preset)"
        >
          {{ preset.name }}
          <span class="preset-desc">{{ preset.description }}</span>
        </button>
      </div>
    </div>

    <div class="editor-section">
      <h4>传递函数预览</h4>
      <div class="transfer-preview" :style="{ background: previewGradient }"></div>
      <div class="transfer-points">
        <div
          v-for="(point, index) in transferPoints"
          :key="index"
          class="point-marker"
          :style="{
            left: ((point.hu - minHU) / (maxHU - minHU) * 100) + '%',
            backgroundColor: point.color
          }"
          :title="`${point.hu} HU`"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.transfer-function-editor {
  padding: 12px;
}

.editor-section {
  margin-bottom: 20px;
}

.editor-section h4 {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: #94a3b8;
  margin: 0 0 12px 0;
}

.wl-control {
  margin-bottom: 12px;
}

.wl-control label {
  display: block;
  font-size: 12px;
  color: #e2e8f0;
  margin-bottom: 4px;
}

.wl-control input[type="range"] {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  background: rgba(99, 102, 241, 0.2);
  border-radius: 3px;
  outline: none;
}

.wl-control input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #818cf8;
  border-radius: 50%;
  cursor: pointer;
}

.hu-range {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #64748b;
  margin-top: 4px;
}

.preset-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.preset-btn {
  padding: 8px 12px;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 6px;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.preset-btn:hover {
  background: rgba(99, 102, 241, 0.1);
  border-color: #818cf8;
}

.preset-btn.active {
  background: rgba(99, 102, 241, 0.2);
  border-color: #818cf8;
  color: #e2e8f0;
}

.preset-desc {
  font-size: 10px;
  opacity: 0.7;
}

.transfer-preview {
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.transfer-points {
  position: relative;
  height: 16px;
  margin-top: 8px;
}

.point-marker {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid #fff;
  transform: translate(-50%, 0);
  cursor: pointer;
  top: 50%;
  transform: translate(-50%, -50%);
}
</style>
