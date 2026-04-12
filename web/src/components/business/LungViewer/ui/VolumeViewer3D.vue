<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { VolumeRaycaster, type RaycasterSettings } from '../core/VolumeRaycaster'
import type { VolumeBuffer } from '../types'

interface Props {
  volumeBuffer: VolumeBuffer | null
  settings?: Partial<RaycasterSettings>
  autoRotate?: boolean
  showBounds?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoRotate: false,
  showBounds: true
})

const emit = defineEmits<{
  (e: 'ready'): void
  (e: 'error', error: Error): void
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let volumeRaycaster: VolumeRaycaster
let animationFrameId: number | null = null
let isInitialized = false

const isReady = ref(false)
const isRendering = ref(false)
const fps = ref(0)

const settings = computed<RaycasterSettings>(() => ({
  rayStepSize: props.settings?.rayStepSize ?? 0.5,
  opacityCorrection: props.settings?.opacityCorrection ?? 0.8,
  isoThreshold: props.settings?.isoThreshold ?? 0.1,
  shadeEnabled: props.settings?.shadeEnabled ?? true,
  shadeIntensity: props.settings?.shadeIntensity ?? 0.3,
  colorMap: props.settings?.colorMap ?? 'grayscale'
}))

let frameCount = 0
let lastFpsUpdate = performance.now()

function init() {
  if (!containerRef.value || !canvasRef.value) return

  try {
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0a)

    const width = containerRef.value.clientWidth
    const height = containerRef.value.clientHeight

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(200, 200, 200)
    camera.lookAt(0, 0, 0)

    renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.value,
      antialias: true,
      alpha: true
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.autoRotate = props.autoRotate
    controls.autoRotateSpeed = 0.5

    volumeRaycaster = new VolumeRaycaster(settings.value)

    addBoundingBox()

    isInitialized = true
    isReady.value = true
    emit('ready')

    animate()
  } catch (error) {
    emit('error', error instanceof Error ? error : new Error('Failed to initialize 3D viewer'))
  }
}

function addBoundingBox() {
  if (!props.showBounds || !props.volumeBuffer) return

  const { spacing, origin, shape } = props.volumeBuffer
  const width = shape[0] * spacing[0]
  const height = shape[1] * spacing[1]
  const depth = shape[2] * spacing[2]

  const geometry = new THREE.BoxGeometry(width, height, depth)
  const edges = new THREE.EdgesGeometry(geometry)
  const material = new THREE.LineBasicMaterial({
    color: 0x6366f1,
    transparent: true,
    opacity: 0.5
  })
  const wireframe = new THREE.LineSegments(edges, material)
  wireframe.position.set(
    origin[0] + width / 2,
    origin[1] + height / 2,
    origin[2] + depth / 2
  )

  scene.add(wireframe)
}

function renderVolume() {
  if (!props.volumeBuffer || !isInitialized) return

  isRendering.value = true

  volumeRaycaster.setVolumeBuffer(props.volumeBuffer)

  const bounds = volumeRaycaster.getBounds()
  if (!bounds) return

  const renderTarget = new THREE.WebGLRenderTarget(
    containerRef.value?.clientWidth || 512,
    containerRef.value?.clientHeight || 512
  )

  const tempScene = new THREE.Scene()
  const tempCamera = new THREE.PerspectiveCamera()
  tempCamera.copy(camera)

  const geometry = new THREE.PlaneGeometry(2, 2)
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uVolumeBuffer: { value: props.volumeBuffer.data },
      uShape: { value: new THREE.Vector3(...props.volumeBuffer.shape) },
      uSpacing: { value: new THREE.Vector3(...props.volumeBuffer.spacing) },
      uOrigin: { value: new THREE.Vector3(...props.volumeBuffer.origin) },
      uCameraPos: { value: camera.position },
      uRayStepSize: { value: settings.value.rayStepSize },
      uOpacityCorrection: { value: settings.value.opacityCorrection },
      uShadeEnabled: { value: settings.value.shadeEnabled ? 1.0 : 0.0 },
      uShadeIntensity: { value: settings.value.shadeIntensity },
      uInverseProjection: { value: camera.projectionMatrixInverse },
      uInverseView: { value: camera.matrixWorld }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler3D uVolumeBuffer;
      uniform vec3 uShape;
      uniform vec3 uSpacing;
      uniform vec3 uOrigin;
      uniform vec3 uCameraPos;
      uniform float uRayStepSize;
      uniform float uOpacityCorrection;
      uniform float uShadeEnabled;
      uniform float uShadeIntensity;
      uniform mat4 uInverseProjection;
      uniform mat4 uInverseView;

      varying vec2 vUv;

      vec3 worldToVolume(vec3 worldPos) {
        return (worldPos - uOrigin) / uSpacing;
      }

      float sampleVolume(vec3 pos) {
        vec3 volPos = worldToVolume(pos);
        if (any(lessThan(volPos, vec3(0.0))) || any(greaterThanEqual(volPos, uShape - 1.0))) {
          return -1000.0;
        }
        return texture(uVolumeBuffer, volPos / uShape).r;
      }

      void main() {
        vec2 ndc = vUv * 2.0 - 1.0;
        vec4 rayClip = vec4(ndc, -1.0, 1.0);
        vec4 rayEye = uInverseProjection * rayClip;
        rayEye = vec4(rayEye.xy, -1.0, 0.0);
        vec3 rayDir = normalize((uInverseView * rayEye).xyz);

        vec3 rayOrigin = uCameraPos;
        vec3 volMin = uOrigin;
        vec3 volMax = uOrigin + uShape * uSpacing;

        vec3 tMin = (volMin - rayOrigin) / rayDir;
        vec3 tMax = (volMax - rayOrigin) / rayDir;
        vec3 t1 = min(tMin, tMax);
        vec3 t2 = max(tMin, tMax);

        float tNear = max(max(t1.x, t1.y), t1.z);
        float tFar = min(min(t2.x, t2.y), t2.z);

        if (tNear > tFar || tFar < 0.0) {
          gl_FragColor = vec4(0.0);
          return;
        }

        vec3 entryPoint = rayOrigin + rayDir * max(0.0, tNear);
        vec3 exitPoint = rayOrigin + rayDir * tFar;
        float rayLength = length(exitPoint - entryPoint);
        int numSteps = int(ceil(rayLength / uRayStepSize));
        float stepSize = rayLength / float(numSteps);
        vec3 stepDir = rayDir * stepSize;

        vec4 accumulatedColor = vec4(0.0);
        vec3 currentPos = entryPoint;

        for (int i = 0; i < 500; i++) {
          if (i >= numSteps || accumulatedColor.a > 0.95) break;

          float value = sampleVolume(currentPos);

          float normalizedValue = clamp((value + 1000.0) / 2000.0, 0.0, 1.0);

          vec3 color = vec3(normalizedValue);
          float opacity = normalizedValue * uOpacityCorrection;

          if (uShadeEnabled > 0.5) {
            float dx = sampleVolume(currentPos + vec3(uSpacing.x, 0.0, 0.0)) -
                       sampleVolume(currentPos - vec3(uSpacing.x, 0.0, 0.0));
            float dy = sampleVolume(currentPos + vec3(0.0, uSpacing.y, 0.0)) -
                       sampleVolume(currentPos - vec3(0.0, uSpacing.y, 0.0));
            float dz = sampleVolume(currentPos + vec3(0.0, 0.0, uSpacing.z)) -
                       sampleVolume(currentPos - vec3(0.0, 0.0, uSpacing.z));
            vec3 normal = normalize(vec3(-dx, -dy, -dz));
            vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
            float diffuse = max(0.0, dot(normal, lightDir));
            color = color * (1.0 - uShadeIntensity + diffuse * uShadeIntensity);
          }

          accumulatedColor.rgb += color * opacity * (1.0 - accumulatedColor.a);
          accumulatedColor.a += opacity * (1.0 - accumulatedColor.a);

          currentPos += stepDir;
        }

        gl_FragColor = accumulatedColor;
      }
    `,
    transparent: true,
    side: THREE.DoubleSide
  })

  const quad = new THREE.Mesh(geometry, material)
  tempScene.add(quad)

  renderer.setRenderTarget(renderTarget)
  renderer.render(tempScene, tempCamera)
  renderer.setRenderTarget(null)

  material.dispose()
  geometry.dispose()
  renderTarget.dispose()

  isRendering.value = false
}

function animate() {
  animationFrameId = requestAnimationFrame(animate)

  const currentTime = performance.now()
  frameCount++

  if (currentTime - lastFpsUpdate >= 1000) {
    fps.value = frameCount
    frameCount = 0
    lastFpsUpdate = currentTime
  }

  if (controls) {
    controls.update()
  }

  if (props.volumeBuffer && isInitialized) {
    renderVolume()
  }
}

function handleResize() {
  if (!containerRef.value || !camera || !renderer) return

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

function resetCamera() {
  if (!camera || !controls) return

  camera.position.set(200, 200, 200)
  controls.target.set(0, 0, 0)
  controls.update()
}

function toggleAutoRotate() {
  if (controls) {
    controls.autoRotate = !controls.autoRotate
  }
}

function dispose() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  if (renderer) {
    renderer.dispose()
    renderer = null as any
  }

  if (controls) {
    controls.dispose()
    controls = null as any
  }

  if (volumeRaycaster) {
    volumeRaycaster.dispose()
    volumeRaycaster = null as any
  }

  isInitialized = false
  isReady.value = false
}

watch(() => props.volumeBuffer, () => {
  if (props.volumeBuffer && isInitialized) {
    renderVolume()
  }
})

watch(() => props.settings, () => {
  if (volumeRaycaster && props.settings) {
    volumeRaycaster.setSettings(props.settings)
    if (props.volumeBuffer) {
      renderVolume()
    }
  }
}, { deep: true })

onMounted(() => {
  init()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  dispose()
})

defineExpose({
  resetCamera,
  toggleAutoRotate,
  isReady
})
</script>

<template>
  <div ref="containerRef" class="volume-viewer-3d">
    <canvas ref="canvasRef" class="viewer-canvas" />

    <div class="viewer-overlay">
      <div class="fps-counter">{{ fps }} FPS</div>
    </div>

    <div class="viewer-controls">
      <button class="control-btn" @click="resetCamera" title="重置视角">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>
      <button class="control-btn" :class="{ active: controls?.autoRotate }" @click="toggleAutoRotate" title="自动旋转">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      </button>
    </div>

    <div v-if="!props.volumeBuffer" class="no-data-overlay">
      <p>加载体积数据以显示3D视图</p>
    </div>
  </div>
</template>

<style scoped>
.volume-viewer-3d {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0a0a0a;
  border-radius: 8px;
  overflow: hidden;
}

.viewer-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.viewer-overlay {
  position: absolute;
  top: 8px;
  left: 8px;
  pointer-events: none;
}

.fps-counter {
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.7);
  color: #4ade80;
  font-size: 12px;
  font-family: monospace;
  border-radius: 4px;
}

.viewer-controls {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  gap: 8px;
}

.control-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.2s;
}

.control-btn:hover {
  background: rgba(99, 102, 241, 0.3);
  border-color: #818cf8;
}

.control-btn.active {
  background: rgba(99, 102, 241, 0.4);
  border-color: #818cf8;
  color: #818cf8;
}

.no-data-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 10, 10, 0.9);
  color: #94a3b8;
  font-size: 14px;
}
</style>
