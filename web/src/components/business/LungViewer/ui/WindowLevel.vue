<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  windowCenter: number
  windowWidth: number
  minWidth?: number
  maxWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  minWidth: 1,
  maxWidth: 4000
})

const emit = defineEmits<{
  (e: 'update', center: number, width: number): void
}>()

const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0, center: 0, width: 0 })

const minDisplay = computed(() => Math.round(props.windowCenter - props.windowWidth / 2))
const maxDisplay = computed(() => Math.round(props.windowCenter + props.windowWidth / 2))

function handleMouseDown(event: MouseEvent) {
  isDragging.value = true
  dragStart.value = {
    x: event.clientX,
    y: event.clientY,
    center: props.windowCenter,
    width: props.windowWidth
  }
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

function handleMouseMove(event: MouseEvent) {
  if (!isDragging.value) return

  const deltaX = event.clientX - dragStart.value.x
  const deltaY = event.clientY - dragStart.value.y

  const newWidth = Math.max(
    props.minWidth,
    Math.min(props.maxWidth, dragStart.value.width + deltaX * 5)
  )

  const sensitivity = 0.5
  const newCenter = dragStart.value.center - deltaY * sensitivity

  emit('update', newCenter, newWidth)
}

function handleMouseUp() {
  isDragging.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

function handleReset() {
  emit('update', 40, 400)
}
</script>

<template>
  <div class="window-level">
    <div class="wl-display">
      <div class="wl-values">
        <div class="wl-row">
          <span class="wl-label">窗宽</span>
          <span class="wl-value">{{ Math.round(windowWidth) }}</span>
        </div>
        <div class="wl-row">
          <span class="wl-label">窗位</span>
          <span class="wl-value">{{ Math.round(windowCenter) }}</span>
        </div>
      </div>
      <div class="wl-range">
        <span>{{ minDisplay }}</span>
        <span>{{ maxDisplay }}</span>
      </div>
    </div>

    <div
      class="wl-canvas-container"
      @mousedown="handleMouseDown"
    >
      <canvas class="wl-canvas" width="200" height="100" />

      <div
        class="wl-indicator"
        :style="{
          left: `${((windowCenter + 1000) / 3000) * 100}%`,
          top: `${100 - ((windowWidth / 4000) * 100)}%`
        }"
        :class="{ dragging: isDragging }"
      />

      <div class="wl-crosshair">
        <div class="wl-crosshair-h" />
        <div class="wl-crosshair-v" />
      </div>
    </div>

    <button class="wl-reset-btn" @click="handleReset">
      重置
    </button>
  </div>
</template>

<style scoped>
.window-level {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: rgba(15, 23, 42, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.wl-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.wl-values {
  display: flex;
  gap: 16px;
}

.wl-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wl-label {
  font-size: 10px;
  color: #94a3b8;
  text-transform: uppercase;
}

.wl-value {
  font-size: 14px;
  font-weight: 600;
  font-family: monospace;
  color: #e2e8f0;
}

.wl-range {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 10px;
  font-family: monospace;
  color: #636366;
}

.wl-canvas-container {
  position: relative;
  width: 100%;
  height: 100px;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-radius: 4px;
  cursor: crosshair;
  overflow: hidden;
}

.wl-canvas {
  width: 100%;
  height: 100%;
}

.wl-indicator {
  position: absolute;
  width: 16px;
  height: 16px;
  background: rgba(99, 102, 241, 0.8);
  border: 2px solid #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  cursor: grab;
  transition: transform 0.1s, box-shadow 0.1s;
  z-index: 10;
}

.wl-indicator:hover {
  transform: translate(-50%, -50%) scale(1.2);
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.6);
}

.wl-indicator.dragging {
  cursor: grabbing;
  transform: translate(-50%, -50%) scale(1.3);
  background: #818cf8;
}

.wl-crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.wl-crosshair-h,
.wl-crosshair-v {
  position: absolute;
  background: rgba(255, 255, 255, 0.2);
}

.wl-crosshair-h {
  top: 50%;
  left: 0;
  width: 100%;
  height: 1px;
}

.wl-crosshair-v {
  left: 50%;
  top: 0;
  width: 1px;
  height: 100%;
}

.wl-reset-btn {
  width: 100%;
  padding: 6px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 4px;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.wl-reset-btn:hover {
  background: rgba(99, 102, 241, 0.2);
  color: #e2e8f0;
}
</style>
