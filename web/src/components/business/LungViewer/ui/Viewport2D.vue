<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

export type ViewportOrientation = 'axial' | 'coronal' | 'sagittal'

interface Props {
  imageData: ImageData | null
  orientation: ViewportOrientation
  sliceIndex: number
  totalSlices: number
  windowCenter: number
  windowWidth: number
  zoom: number
  pan: { x: number; y: number }
  crosshairPosition?: { x: number; y: number } | null
  showCrosshair?: boolean
  active?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  orientation: 'axial',
  sliceIndex: 0,
  totalSlices: 1,
  windowCenter: 40,
  windowWidth: 400,
  zoom: 1,
  pan: () => ({ x: 0, y: 0 }),
  crosshairPosition: null,
  showCrosshair: true,
  active: false
})

const emit = defineEmits<{
  (e: 'sliceChange', index: number): void
  (e: 'windowLevelChange', center: number, width: number): void
  (e: 'pan', pan: { x: number; y: number }): void
  (e: 'zoom', zoom: number): void
  (e: 'click', event: MouseEvent, imageCoords: { x: number; y: number }): void
  (e: 'mousemove', event: MouseEvent, imageCoords: { x: number; y: number }): void
  (e: 'viewportClick', event: MouseEvent): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const isDragging = ref(false)
const isWindowLevelDragging = ref(false)
const lastMousePosition = ref({ x: 0, y: 0 })
const mouseImageCoords = ref({ x: 0, y: 0 })
const hoverValue = ref<number | null>(null)

const orientationLabel = computed(() => {
  switch (props.orientation) {
    case 'axial': return 'AX'
    case 'coronal': return 'COR'
    case 'sagittal': return 'SAG'
    default: return ''
  }
})

const sliceLabel = computed(() => {
  return `${props.sliceIndex + 1} / ${props.totalSlices}`
})

const windowLevelLabel = computed(() => {
  return `W: ${Math.round(props.windowWidth)} L: ${Math.round(props.windowCenter)}`
})

function applyWindowLevelToImageData(imageData: ImageData, center: number, width: number): ImageData {
  const min = center - width / 2
  const max = center + width / 2
  const range = max - min

  const result = new ImageData(imageData.width, imageData.height)

  for (let i = 0; i < imageData.data.length; i += 4) {
    const value = imageData.data[i]

    let normalized = (value - min) / range
    normalized = Math.max(0, Math.min(1, normalized))

    const output = Math.floor(normalized * 255)

    result.data[i] = output
    result.data[i + 1] = output
    result.data[i + 2] = output
    result.data[i + 3] = 255
  }

  return result
}

function render() {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  if (!props.imageData) {
    ctx.fillStyle = '#333'
    ctx.font = '16px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('No Data', canvas.width / 2, canvas.height / 2)
    return
  }

  const windowedData = applyWindowLevelToImageData(props.imageData, props.windowCenter, props.windowWidth)

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = windowedData.width
  tempCanvas.height = windowedData.height
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) return

  tempCtx.putImageData(windowedData, 0, 0)

  ctx.save()

  const centerX = canvas.width / 2 + props.pan.x
  const centerY = canvas.height / 2 + props.pan.y

  ctx.translate(centerX, centerY)
  ctx.scale(props.zoom, props.zoom)
  ctx.translate(-tempCanvas.width / 2, -tempCanvas.height / 2)

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(tempCanvas, 0, 0)

  ctx.restore()

  if (props.showCrosshair && props.crosshairPosition) {
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])

    ctx.beginPath()
    ctx.moveTo(props.crosshairPosition.x, 0)
    ctx.lineTo(props.crosshairPosition.x, canvas.height)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, props.crosshairPosition.y)
    ctx.lineTo(canvas.width, props.crosshairPosition.y)
    ctx.stroke()

    ctx.setLineDash([])
  }

  if (props.showCrosshair && mouseImageCoords.value) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(mouseImageCoords.value.x, 0)
    ctx.lineTo(mouseImageCoords.value.x, canvas.height)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, mouseImageCoords.value.y)
    ctx.lineTo(canvas.width, mouseImageCoords.value.y)
    ctx.stroke()
  }
}

watch(
  () => [props.imageData, props.windowCenter, props.windowWidth, props.zoom, props.pan, props.sliceIndex, props.crosshairPosition],
  () => {
    requestAnimationFrame(render)
  },
  { deep: true }
)

onMounted(() => {
  render()
})

function handleMouseDown(event: MouseEvent) {
  if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
    isDragging.value = true
    lastMousePosition.value = { x: event.clientX, y: event.clientY }
    event.preventDefault()
  } else if (event.button === 0) {
    if (event.ctrlKey || event.metaKey) {
      isWindowLevelDragging.value = true
      lastMousePosition.value = { x: event.clientX, y: event.clientY }
    }
  }
}

function handleMouseMove(event: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  mouseImageCoords.value = {
    x: Math.floor(x),
    y: Math.floor(y)
  }

  if (props.imageData) {
    const idx = (mouseImageCoords.value.y * props.imageData.width + mouseImageCoords.value.x) * 4
    if (props.imageData.data && idx < props.imageData.data.length) {
      hoverValue.value = props.imageData.data[idx]
    }
  }

  emit('mousemove', event, mouseImageCoords.value)

  if (isDragging.value) {
    const deltaX = event.clientX - lastMousePosition.value.x
    const deltaY = event.clientY - lastMousePosition.value.y
    emit('pan', {
      x: props.pan.x + deltaX,
      y: props.pan.y + deltaY
    })
    lastMousePosition.value = { x: event.clientX, y: event.clientY }
  }

  if (isWindowLevelDragging.value) {
    const deltaX = event.clientX - lastMousePosition.value.x
    const deltaY = event.clientY - lastMousePosition.value.y

    const newWidth = Math.max(1, props.windowWidth + deltaX * 4)
    const newCenter = props.windowCenter - deltaY * 4

    emit('windowLevelChange', newCenter, newWidth)
    lastMousePosition.value = { x: event.clientX, y: event.clientY }
  }
}

function handleMouseUp() {
  isDragging.value = false
  isWindowLevelDragging.value = false
}

function handleWheel(event: WheelEvent) {
  event.preventDefault()

  const delta = event.deltaY > 0 ? 0.9 : 1.1
  const newZoom = Math.max(0.1, Math.min(10, props.zoom * delta))
  emit('zoom', newZoom)
}

function handleClick(event: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return

  if (isDragging.value || isWindowLevelDragging.value) return

  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const imageCoords = {
    x: Math.floor((x - props.pan.x - canvas.width / 2) / props.zoom + (props.imageData?.width || 0) / 2),
    y: Math.floor((y - props.pan.y - canvas.height / 2) / props.zoom + (props.imageData?.height || 0) / 2)
  }

  emit('click', event, imageCoords)
}

function handleContextMenu(event: MouseEvent) {
  event.preventDefault()
}

function resetView() {
  emit('zoom', 1)
  emit('pan', { x: 0, y: 0 })
}

function fitToWindow() {
  if (!canvasRef.value || !props.imageData) return

  const canvas = canvasRef.value
  const scaleX = canvas.width / props.imageData.width
  const scaleY = canvas.height / props.imageData.height
  const newZoom = Math.min(scaleX, scaleY) * 0.9

  emit('zoom', newZoom)
  emit('pan', { x: 0, y: 0 })
}

defineExpose({
  resetView,
  fitToWindow
})
</script>

<template>
  <div
    ref="containerRef"
    class="viewport-2d"
    :class="{ active }"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
    @wheel="handleWheel"
    @click="handleClick"
    @contextmenu="handleContextMenu"
  >
    <div class="viewport-header">
      <span class="orientation-badge">{{ orientationLabel }}</span>
      <span class="slice-label">{{ sliceLabel }}</span>
    </div>

    <div class="viewport-info">
      <span class="window-level">{{ windowLevelLabel }}</span>
      <span v-if="hoverValue !== null" class="hu-value">{{ hoverValue }} HU</span>
    </div>

    <canvas
      ref="canvasRef"
      class="viewport-canvas"
      :width="512"
      :height="512"
    />

    <div class="viewport-controls">
      <button class="control-btn" @click="fitToWindow" title="适应窗口">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
        </svg>
      </button>
      <button class="control-btn" @click="resetView" title="重置视图">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>
    </div>

    <div class="viewport-footer">
      <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
    </div>
  </div>
</template>

<style scoped>
.viewport-2d {
  position: relative;
  display: flex;
  flex-direction: column;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.viewport-2d.active {
  border-color: var(--color-primary, #4a9eff);
}

.viewport-header {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  gap: 8px;
  z-index: 10;
}

.orientation-badge {
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  border-radius: 4px;
  font-family: monospace;
}

.slice-label {
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 12px;
  border-radius: 4px;
  font-family: monospace;
}

.viewport-info {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  z-index: 10;
}

.window-level {
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 11px;
  border-radius: 4px;
  font-family: monospace;
}

.hu-value {
  padding: 2px 8px;
  background: rgba(74, 158, 255, 0.8);
  color: #fff;
  font-size: 11px;
  border-radius: 4px;
  font-family: monospace;
}

.viewport-canvas {
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.viewport-controls {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  z-index: 10;
}

.control-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  border: none;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  transition: background-color 0.2s;
}

.control-btn:hover {
  background: rgba(74, 158, 255, 0.8);
}

.viewport-footer {
  position: absolute;
  bottom: 8px;
  left: 8px;
  z-index: 10;
}

.zoom-level {
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 11px;
  border-radius: 4px;
  font-family: monospace;
}
</style>
