import { ref, shallowRef, computed } from 'vue'
import type { VolumeBuffer } from '../types'
import type {
  SegmentedLungs,
  AirwayTree
} from '../types/segmentation'
import { LungSegmentation, createLungSegmentation } from '../core/LungSegmentation'
import { AirwayExtraction, createAirwayExtraction } from '../core/AirwayExtraction'
import { MeshGenerator, createMeshGenerator } from '../core/MeshGenerator'
import * as THREE from 'three'

export function useLungSegmentation() {
  const isSegmenting = ref(false)
  const segmentationProgress = ref(0)
  const error = ref<Error | null>(null)

  const lungSegmentation = shallowRef<LungSegmentation | null>(null)
  const airwayExtraction = shallowRef<AirwayExtraction | null>(null)
  const meshGenerator = shallowRef<MeshGenerator | null>(null)

  const segmentedLungs = shallowRef<SegmentedLungs | null>(null)
  const airwayTree = shallowRef<AirwayTree | null>(null)
  const lungMesh = shallowRef<THREE.Mesh | null>(null)
  const airwayMesh = shallowRef<THREE.Mesh | null>(null)

  const hasSegmentation = computed(() => segmentedLungs.value !== null)
  const hasAirway = computed(() => airwayTree.value !== null)

  function initialize(volumeBuffer: VolumeBuffer) {
    const lungSeg = createLungSegmentation()
    lungSeg.setVolume(volumeBuffer.data, volumeBuffer.shape)
    lungSegmentation.value = lungSeg

    const airwayExt = createAirwayExtraction()
    airwayExt.setVolume(volumeBuffer.data, volumeBuffer.shape, volumeBuffer.spacing)
    airwayExtraction.value = airwayExt

    const meshGen = createMeshGenerator()
    meshGen.setVolume(volumeBuffer.data, volumeBuffer.shape, volumeBuffer.spacing)
    meshGenerator.value = meshGen
  }

  async function segmentLungs(): Promise<SegmentedLungs | null> {
    if (!lungSegmentation.value) {
      error.value = new Error('Lung segmentation not initialized')
      return null
    }

    isSegmenting.value = true
    segmentationProgress.value = 0
    error.value = null

    try {
      segmentationProgress.value = 10

      const result = lungSegmentation.value.segment()

      segmentationProgress.value = 60

      segmentedLungs.value = result

      segmentationProgress.value = 80

      if (meshGenerator.value && result.fullLungMask) {
        const mesh = meshGenerator.value.createLungMesh(result.fullLungMask)
        lungMesh.value = mesh
      }

      segmentationProgress.value = 100

      return result
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Segmentation failed')
      return null
    } finally {
      isSegmenting.value = false
    }
  }

  async function extractAirways(seedPoint?: { x: number; y: number; z: number; index: number }): Promise<AirwayTree | null> {
    if (!airwayExtraction.value) {
      error.value = new Error('Airway extraction not initialized')
      return null
    }

    isSegmenting.value = true
    segmentationProgress.value = 0
    error.value = null

    try {
      segmentationProgress.value = 10

      const tree = airwayExtraction.value.extract(seedPoint)

      segmentationProgress.value = 70

      airwayTree.value = tree

      segmentationProgress.value = 90

      if (meshGenerator.value) {
        const tubeGeom = airwayExtraction.value.generateTubeGeometry(tree)
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(tubeGeom.positions, 3))
        geometry.setAttribute('normal', new THREE.BufferAttribute(tubeGeom.normals, 3))
        geometry.setIndex(new THREE.BufferAttribute(tubeGeom.indices, 1))

        const material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
          metalness: 0.0,
          roughness: 0.5
        })

        airwayMesh.value = new THREE.Mesh(geometry, material)
      }

      segmentationProgress.value = 100

      return tree
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Airway extraction failed')
      return null
    } finally {
      isSegmenting.value = false
    }
  }

  async function runFullSegmentation(volumeBuffer: VolumeBuffer): Promise<void> {
    initialize(volumeBuffer)
    await segmentLungs()
    await extractAirways()
  }

  function reset() {
    segmentedLungs.value = null
    airwayTree.value = null
    lungMesh.value = null
    airwayMesh.value = null
    error.value = null
    segmentationProgress.value = 0
  }

  function dispose() {
    reset()
    lungSegmentation.value = null
    airwayExtraction.value = null
    meshGenerator.value = null

    if (lungMesh.value) {
      lungMesh.value.geometry.dispose()
      if (lungMesh.value.material instanceof THREE.Material) {
        lungMesh.value.material.dispose()
      }
      lungMesh.value = null
    }

    if (airwayMesh.value) {
      airwayMesh.value.geometry.dispose()
      if (airwayMesh.value.material instanceof THREE.Material) {
        airwayMesh.value.material.dispose()
      }
      airwayMesh.value = null
    }
  }

  return {
    isSegmenting,
    segmentationProgress,
    error,
    segmentedLungs,
    airwayTree,
    lungMesh,
    airwayMesh,
    hasSegmentation,
    hasAirway,
    initialize,
    segmentLungs,
    extractAirways,
    runFullSegmentation,
    reset,
    dispose
  }
}
