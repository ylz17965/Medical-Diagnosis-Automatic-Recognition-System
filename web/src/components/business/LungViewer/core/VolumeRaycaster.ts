import * as THREE from 'three'
import type { VolumeBuffer } from '../types'

export interface RaycasterSettings {
  rayStepSize: number
  opacityCorrection: number
  isoThreshold: number
  shadeEnabled: boolean
  shadeIntensity: number
  colorMap: 'grayscale' | 'hot' | 'bone' | 'jet'
}

export interface TransferFunctionEntry {
  value: number
  color: [number, number, number]
  opacity: number
}

export interface VolumeRaycasterResult {
  color: THREE.Color
  opacity: number
  accumulatedOpacity: number
  accumulatedColor: THREE.Color
  hit: boolean
  exitPoint: THREE.Vector3
}

export class VolumeRaycaster {
  private volumeBuffer: VolumeBuffer | null = null
  private settings: RaycasterSettings
  private transferFunction: TransferFunctionEntry[] = []
  private boxMesh: THREE.Mesh | null = null
  private bounds: {
    min: THREE.Vector3
    max: THREE.Vector3
  } | null = null

  constructor(settings?: Partial<RaycasterSettings>) {
    this.settings = {
      rayStepSize: settings?.rayStepSize ?? 0.5,
      opacityCorrection: settings?.opacityCorrection ?? 0.8,
      isoThreshold: settings?.isoThreshold ?? 0.1,
      shadeEnabled: settings?.shadeEnabled ?? true,
      shadeIntensity: settings?.shadeIntensity ?? 0.3,
      colorMap: settings?.colorMap ?? 'grayscale'
    }
    this.initializeTransferFunction()
  }

  private initializeTransferFunction(): void {
    this.transferFunction = [
      { value: -1000, color: [0, 0, 0], opacity: 0 },
      { value: -950, color: [0, 0, 0], opacity: 0 },
      { value: -700, color: [100, 50, 50], opacity: 0.1 },
      { value: -600, color: [150, 100, 100], opacity: 0.3 },
      { value: -400, color: [200, 150, 150], opacity: 0.5 },
      { value: -100, color: [220, 200, 200], opacity: 0.7 },
      { value: 100, color: [240, 230, 220], opacity: 0.85 },
      { value: 300, color: [255, 255, 255], opacity: 0.95 },
      { value: 400, color: [255, 200, 200], opacity: 1.0 },
      { value: 1000, color: [255, 255, 255], opacity: 1.0 }
    ]
  }

  public setVolumeBuffer(buffer: VolumeBuffer): void {
    this.volumeBuffer = buffer
    this.updateBounds()
  }

  private updateBounds(): void {
    if (!this.volumeBuffer) return

    const { spacing, origin, shape } = this.volumeBuffer
    const width = shape[0] * spacing[0]
    const height = shape[1] * spacing[1]
    const depth = shape[2] * spacing[2]

    this.bounds = {
      min: new THREE.Vector3(origin[0], origin[1], origin[2]),
      max: new THREE.Vector3(
        origin[0] + width,
        origin[1] + height,
        origin[2] + depth
      )
    }
  }

  public getBounds(): { min: THREE.Vector3; max: THREE.Vector3 } | null {
    return this.bounds
  }

  public setSettings(newSettings: Partial<RaycasterSettings>): void {
    this.settings = { ...this.settings, ...newSettings }
  }

  public getSettings(): RaycasterSettings {
    return { ...this.settings }
  }

  public raycast(ray: THREE.Ray): VolumeRaycasterResult | null {
    if (!this.bounds || !this.volumeBuffer) {
      return null
    }

    const result: VolumeRaycasterResult = {
      color: new THREE.Color(0, 0, 0),
      opacity: 0,
      accumulatedOpacity: 0,
      accumulatedColor: new THREE.Color(0, 0, 0),
      hit: false,
      exitPoint: new THREE.Vector3()
    }

    const rayDirection = ray.direction.clone().normalize()
    const rayOrigin = ray.origin.clone()

    const entryPoint = this.computeEntryPoint(rayOrigin, rayDirection)
    const exitPoint = this.computeExitPoint(rayOrigin, rayDirection)

    if (!entryPoint || !exitPoint) {
      return result
    }

    result.hit = true
    result.exitPoint = exitPoint

    const rayLength = entryPoint.distanceTo(exitPoint)
    const numberOfSteps = Math.ceil(rayLength / this.settings.rayStepSize)
    const stepSize = rayLength / numberOfSteps

    const currentPosition = entryPoint.clone()
    const stepDirection = rayDirection.clone().multiplyScalar(stepSize)

    const { spacing, origin, shape, data } = this.volumeBuffer

    for (let i = 0; i < numberOfSteps; i++) {
      currentPosition.add(stepDirection)

      if (result.accumulatedOpacity >= 0.95) {
        break
      }

      const localCoords = this.worldToLocal(
        currentPosition.x,
        currentPosition.y,
        currentPosition.z,
        origin,
        spacing
      )

      if (!this.isInsideVolume(localCoords, shape)) {
        continue
      }

      const value = this.sampleVolume(data, localCoords, shape)
      const { color, opacity } = this.applyTransferFunction(value)

      if (this.settings.shadeEnabled) {
        const gradient = this.computeGradient(data, localCoords, shape, spacing)
        const normal = this.computeNormal(gradient)
        const lightDir = new THREE.Vector3(0.5, 1, 0.5).normalize()
        const diffuse = Math.max(0, normal.dot(lightDir))
        const shadedColor = color.clone().multiplyScalar(
          1 - this.settings.shadeIntensity + diffuse * this.settings.shadeIntensity
        )
        color.copy(shadedColor)
      }

      const correctedOpacity = opacity * this.settings.opacityCorrection

      result.accumulatedColor.r += color.r * correctedOpacity * (1 - result.accumulatedOpacity)
      result.accumulatedColor.g += color.g * correctedOpacity * (1 - result.accumulatedOpacity)
      result.accumulatedColor.b += color.b * correctedOpacity * (1 - result.accumulatedOpacity)

      result.accumulatedOpacity += correctedOpacity * (1 - result.accumulatedOpacity)
    }

    result.color.copy(result.accumulatedColor)
    result.opacity = result.accumulatedOpacity

    return result
  }

  private computeEntryPoint(
    origin: THREE.Vector3,
    direction: THREE.Vector3
  ): THREE.Vector3 | null {
    if (!this.bounds) return null

    const { min, max } = this.bounds
    const tMin = new THREE.Vector3()
    const tMax = new THREE.Vector3()

    const invDir = new THREE.Vector3(
      direction.x !== 0 ? 1 / direction.x : Infinity,
      direction.y !== 0 ? 1 / direction.y : Infinity,
      direction.z !== 0 ? 1 / direction.z : Infinity
    )

    tMin.x = (min.x - origin.x) * invDir.x
    tMax.x = (max.x - origin.x) * invDir.x
    tMin.y = (min.y - origin.y) * invDir.y
    tMax.y = (max.y - origin.y) * invDir.y
    tMin.z = (min.z - origin.z) * invDir.z
    tMax.z = (max.z - origin.z) * invDir.z

    const t0 = new THREE.Vector3(
      Math.min(tMin.x, tMax.x),
      Math.min(tMin.y, tMax.y),
      Math.min(tMin.z, tMax.z)
    )

    const t1 = new THREE.Vector3(
      Math.max(tMin.x, tMax.x),
      Math.max(tMin.y, tMax.y),
      Math.max(tMin.z, tMax.z)
    )

    const tNear = Math.max(t0.x, t0.y, t0.z)
    const tFar = Math.min(t1.x, t1.y, t1.z)

    if (tNear > tFar || tFar < 0) {
      return null
    }

    const t = tNear > 0 ? tNear : tFar

    return origin.clone().add(direction.clone().multiplyScalar(t))
  }

  private computeExitPoint(
    origin: THREE.Vector3,
    direction: THREE.Vector3
  ): THREE.Vector3 | null {
    if (!this.bounds) return null

    const { min, max } = this.bounds
    const tMin = new THREE.Vector3()
    const tMax = new THREE.Vector3()

    const invDir = new THREE.Vector3(
      direction.x !== 0 ? 1 / direction.x : Infinity,
      direction.y !== 0 ? 1 / direction.y : Infinity,
      direction.z !== 0 ? 1 / direction.z : Infinity
    )

    tMin.x = (min.x - origin.x) * invDir.x
    tMax.x = (max.x - origin.x) * invDir.x
    tMin.y = (min.y - origin.y) * invDir.y
    tMax.y = (max.y - origin.y) * invDir.y
    tMin.z = (min.z - origin.z) * invDir.z
    tMax.z = (max.z - origin.z) * invDir.z

    const t0 = new THREE.Vector3(
      Math.min(tMin.x, tMax.x),
      Math.min(tMin.y, tMax.y),
      Math.min(tMin.z, tMax.z)
    )

    const t1 = new THREE.Vector3(
      Math.max(tMin.x, tMax.x),
      Math.max(tMin.y, tMax.y),
      Math.max(tMin.z, tMax.z)
    )

    const tNear = Math.max(t0.x, t0.y, t0.z)
    const tFar = Math.min(t1.x, t1.y, t1.z)

    const t = tFar > 0 ? tFar : tNear

    return origin.clone().add(direction.clone().multiplyScalar(t))
  }

  private worldToLocal(
    wx: number,
    wy: number,
    wz: number,
    origin: [number, number, number],
    spacing: [number, number, number]
  ): { x: number; y: number; z: number } {
    return {
      x: (wx - origin[0]) / spacing[0],
      y: (wy - origin[1]) / spacing[1],
      z: (wz - origin[2]) / spacing[2]
    }
  }

  private isInsideVolume(
    coords: { x: number; y: number; z: number },
    shape: [number, number, number]
  ): boolean {
    return (
      coords.x >= 0 &&
      coords.x < shape[0] - 1 &&
      coords.y >= 0 &&
      coords.y < shape[1] - 1 &&
      coords.z >= 0 &&
      coords.z < shape[2] - 1
    )
  }

  private sampleVolume(
    data: Float32Array,
    coords: { x: number; y: number; z: number },
    shape: [number, number, number]
  ): number {
    const x0 = Math.floor(coords.x)
    const y0 = Math.floor(coords.y)
    const z0 = Math.floor(coords.z)

    const x1 = Math.min(x0 + 1, shape[0] - 1)
    const y1 = Math.min(y0 + 1, shape[1] - 1)
    const z1 = Math.min(z0 + 1, shape[2] - 1)

    const xFrac = coords.x - x0
    const yFrac = coords.y - y0
    const zFrac = coords.z - z0

    const c000 = this.getVoxel(data, x0, y0, z0, shape)
    const c001 = this.getVoxel(data, x1, y0, z0, shape)
    const c010 = this.getVoxel(data, x0, y1, z0, shape)
    const c011 = this.getVoxel(data, x1, y1, z0, shape)
    const c100 = this.getVoxel(data, x0, y0, z1, shape)
    const c101 = this.getVoxel(data, x1, y0, z1, shape)
    const c110 = this.getVoxel(data, x0, y1, z1, shape)
    const c111 = this.getVoxel(data, x1, y1, z1, shape)

    const c00 = c000 * (1 - xFrac) + c001 * xFrac
    const c01 = c010 * (1 - xFrac) + c011 * xFrac
    const c10 = c100 * (1 - xFrac) + c101 * xFrac
    const c11 = c110 * (1 - xFrac) + c111 * xFrac

    const c0 = c00 * (1 - yFrac) + c01 * yFrac
    const c1 = c10 * (1 - yFrac) + c11 * yFrac

    return c0 * (1 - zFrac) + c1 * zFrac
  }

  private getVoxel(
    data: Float32Array,
    x: number,
    y: number,
    z: number,
    shape: [number, number, number]
  ): number {
    const index = z * shape[0] * shape[1] + y * shape[0] + x
    if (index < 0 || index >= data.length) {
      return -1000
    }
    return data[index]
  }

  private computeGradient(
    data: Float32Array,
    coords: { x: number; y: number; z: number },
    shape: [number, number, number],
    spacing: [number, number, number]
  ): { x: number; y: number; z: number } {
    const dx =
      (this.getVoxel(data, Math.floor(coords.x) + 1, Math.floor(coords.y), Math.floor(coords.z), shape) -
        this.getVoxel(data, Math.floor(coords.x) - 1, Math.floor(coords.y), Math.floor(coords.z), shape)) /
      (2 * spacing[0])

    const dy =
      (this.getVoxel(data, Math.floor(coords.x), Math.floor(coords.y) + 1, Math.floor(coords.z), shape) -
        this.getVoxel(data, Math.floor(coords.x), Math.floor(coords.y) - 1, Math.floor(coords.z), shape)) /
      (2 * spacing[1])

    const dz =
      (this.getVoxel(data, Math.floor(coords.x), Math.floor(coords.y), Math.floor(coords.z) + 1, shape) -
        this.getVoxel(data, Math.floor(coords.x), Math.floor(coords.y), Math.floor(coords.z) - 1, shape)) /
      (2 * spacing[2])

    return { x: dx, y: dy, z: dz }
  }

  private computeNormal(gradient: { x: number; y: number; z: number }): THREE.Vector3 {
    const normal = new THREE.Vector3(-gradient.x, -gradient.y, -gradient.z)
    normal.normalize()
    return normal
  }

  private applyTransferFunction(value: number): { color: THREE.Color; opacity: number } {
    for (let i = 0; i < this.transferFunction.length - 1; i++) {
      const entry1 = this.transferFunction[i]
      const entry2 = this.transferFunction[i + 1]

      if (value >= entry1.value && value < entry2.value) {
        const t = (value - entry1.value) / (entry2.value - entry1.value)

        const color = new THREE.Color(
          entry1.color[0] / 255 * (1 - t) + entry2.color[0] / 255 * t,
          entry1.color[1] / 255 * (1 - t) + entry2.color[1] / 255 * t,
          entry1.color[2] / 255 * (1 - t) + entry2.color[2] / 255 * t
        )

        const opacity = entry1.opacity * (1 - t) + entry2.opacity * t

        return { color, opacity }
      }
    }

    const lastEntry = this.transferFunction[this.transferFunction.length - 1]
    return {
      color: new THREE.Color(
        lastEntry.color[0] / 255,
        lastEntry.color[1] / 255,
        lastEntry.color[2] / 255
      ),
      opacity: lastEntry.opacity
    }
  }

  public setTransferFunction(entries: TransferFunctionEntry[]): void {
    this.transferFunction = entries
  }

  public createBoundingBox(): THREE.Mesh | null {
    if (!this.bounds) return null

    const { min, max } = this.bounds
    const size = new THREE.Vector3().subVectors(max, min)

    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.1
    })

    this.boxMesh = new THREE.Mesh(geometry, material)
    this.boxMesh.position.copy(new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5))

    return this.boxMesh
  }

  public dispose(): void {
    if (this.boxMesh) {
      this.boxMesh.geometry.dispose()
      ;(this.boxMesh.material as THREE.Material).dispose()
      this.boxMesh = null
    }
    this.volumeBuffer = null
    this.bounds = null
  }
}
