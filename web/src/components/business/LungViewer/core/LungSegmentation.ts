import type {
  Point3D,
  LungBounds,
  SegmentedLungs,
  SegmentationConfig,
  MeshData
} from '../types/segmentation'
import { DEFAULT_SEGMENTATION_CONFIG } from '../types/segmentation'

export class LungSegmentation {
  private volumeData: Float32Array | null = null
  private shape: [number, number, number] = [0, 0, 0]
  private config: SegmentationConfig

  constructor(config?: Partial<SegmentationConfig>) {
    this.config = { ...DEFAULT_SEGMENTATION_CONFIG, ...config }
  }

  public setVolume(volumeData: Float32Array, shape: [number, number, number]): void {
    this.volumeData = volumeData
    this.shape = shape
  }

  public segment(): SegmentedLungs {
    if (!this.volumeData) {
      throw new Error('Volume data not set')
    }

    const binaryMask = this.thresholdSegmentation()
    const filledMask = this.morphologicalClose(binaryMask)
    const { leftMask, rightMask } = this.separateLeftAndRightLungs(filledMask)
    const fullMask = this.combineMasks(leftMask, rightMask)

    const leftBounds = this.computeBounds(leftMask)
    const rightBounds = this.computeBounds(rightMask)
    const fullBounds = this.computeBounds(fullMask)

    return {
      leftLungMask: leftMask,
      rightLungMask: rightMask,
      fullLungMask: fullMask,
      leftLungBounds: leftBounds,
      rightLungBounds: rightBounds,
      fullLungBounds: fullBounds
    }
  }

  private thresholdSegmentation(): Uint8Array {
    const mask = new Uint8Array(this.volumeData!.length)
    const { lungMinThreshold, lungMaxThreshold } = this.config

    for (let i = 0; i < this.volumeData!.length; i++) {
      const value = this.volumeData![i]
      if (value >= lungMinThreshold && value <= lungMaxThreshold) {
        mask[i] = 1
      }
    }

    return mask
  }

  private morphologicalClose(mask: Uint8Array, iterations: number = 2): Uint8Array {
    let result = this.dilate(mask, iterations)
    result = this.erode(result, iterations)
    return result
  }

  private dilate(mask: Uint8Array, iterations: number): Uint8Array {
    let result = new Uint8Array(mask)

    for (let iter = 0; iter < iterations; iter++) {
      const newMask = new Uint8Array(mask.length)

      for (let z = 1; z < this.shape[2] - 1; z++) {
        for (let y = 1; y < this.shape[1] - 1; y++) {
          for (let x = 1; x < this.shape[0] - 1; x++) {
            const idx = this.getIndex(x, y, z)
            if (mask[idx] === 1 || this.hasNeighbor(mask, x, y, z)) {
              newMask[idx] = 1
            }
          }
        }
      }

      result = newMask
    }

    return result
  }

  private erode(mask: Uint8Array, iterations: number): Uint8Array {
    let result = new Uint8Array(mask)

    for (let iter = 0; iter < iterations; iter++) {
      const newMask = new Uint8Array(mask.length)

      for (let z = 1; z < this.shape[2] - 1; z++) {
        for (let y = 1; y < this.shape[1] - 1; y++) {
          for (let x = 1; x < this.shape[0] - 1; x++) {
            const idx = this.getIndex(x, y, z)
            if (mask[idx] === 1 && this.hasAllNeighbors(mask, x, y, z)) {
              newMask[idx] = 1
            }
          }
        }
      }

      result = newMask
    }

    return result
  }

  private hasNeighbor(mask: Uint8Array, x: number, y: number, z: number): boolean {
    const neighbors = [
      [x - 1, y, z], [x + 1, y, z],
      [x, y - 1, z], [x, y + 1, z],
      [x, y, z - 1], [x, y, z + 1]
    ]

    for (const [nx, ny, nz] of neighbors) {
      if (this.isInBounds(nx, ny, nz) && mask[this.getIndex(nx, ny, nz)] === 1) {
        return true
      }
    }

    return false
  }

  private hasAllNeighbors(mask: Uint8Array, x: number, y: number, z: number): boolean {
    const neighbors = [
      [x - 1, y, z], [x + 1, y, z],
      [x, y - 1, z], [x, y + 1, z],
      [x, y, z - 1], [x, y, z + 1]
    ]

    for (const [nx, ny, nz] of neighbors) {
      if (!this.isInBounds(nx, ny, nz) || mask[this.getIndex(nx, ny, nz)] !== 1) {
        return false
      }
    }

    return true
  }

  private separateLeftAndRightLungs(mask: Uint8Array): { leftMask: Uint8Array; rightMask: Uint8Array } {
    const visited = new Uint8Array(mask.length)
    const leftMask = new Uint8Array(mask.length)
    const rightMask = new Uint8Array(mask.length)

    const regions: { points: Point3D[]; size: number }[] = []

    for (let z = 0; z < this.shape[2]; z++) {
      for (let y = 0; y < this.shape[1]; y++) {
        for (let x = 0; x < this.shape[0]; x++) {
          const idx = this.getIndex(x, y, z)
          if (mask[idx] === 1 && visited[idx] === 0) {
            const region = this.floodFill(mask, visited, x, y, z)
            if (region.length > this.config.minLungVolume) {
              regions.push({ points: region, size: region.length })
            }
          }
        }
      }
    }

    regions.sort((a, b) => b.size - a.size)

    if (regions.length >= 1) {
      const largestRegion = regions[0]
      const centerX = largestRegion.points.reduce((sum, p) => sum + p.x, 0) / largestRegion.points.length

      if (centerX < this.shape[0] / 2) {
        for (const p of largestRegion.points) {
          leftMask[p.index] = 1
        }
      } else {
        for (const p of largestRegion.points) {
          rightMask[p.index] = 1
        }
      }
    }

    if (regions.length >= 2) {
      const secondLargestRegion = regions[1]
      const centerX = secondLargestRegion.points.reduce((sum, p) => sum + p.x, 0) / secondLargestRegion.points.length

      if (centerX < this.shape[0] / 2) {
        for (const p of secondLargestRegion.points) {
          leftMask[p.index] = 1
        }
      } else {
        for (const p of secondLargestRegion.points) {
          rightMask[p.index] = 1
        }
      }
    }

    return { leftMask, rightMask }
  }

  private floodFill(mask: Uint8Array, visited: Uint8Array, startX: number, startY: number, startZ: number): Point3D[] {
    const points: Point3D[] = []
    const queue: Point3D[] = []
    const startIdx = this.getIndex(startX, startY, startZ)

    queue.push({ x: startX, y: startY, z: startZ, index: startIdx })
    visited[startIdx] = 1

    while (queue.length > 0) {
      const current = queue.shift()!
      points.push(current)

      const neighbors = [
        { x: current.x - 1, y: current.y, z: current.z },
        { x: current.x + 1, y: current.y, z: current.z },
        { x: current.x, y: current.y - 1, z: current.z },
        { x: current.x, y: current.y + 1, z: current.z },
        { x: current.x, y: current.y, z: current.z - 1 },
        { x: current.x, y: current.y, z: current.z + 1 }
      ]

      for (const neighbor of neighbors) {
        if (this.isInBounds(neighbor.x, neighbor.y, neighbor.z)) {
          const nIdx = this.getIndex(neighbor.x, neighbor.y, neighbor.z)
          if (mask[nIdx] === 1 && visited[nIdx] === 0) {
            visited[nIdx] = 1
            queue.push({ x: neighbor.x, y: neighbor.y, z: neighbor.z, index: nIdx })
          }
        }
      }
    }

    return points
  }

  private combineMasks(leftMask: Uint8Array, rightMask: Uint8Array): Uint8Array {
    const fullMask = new Uint8Array(leftMask.length)
    for (let i = 0; i < fullMask.length; i++) {
      fullMask[i] = leftMask[i] || rightMask[i]
    }
    return fullMask
  }

  private computeBounds(mask: Uint8Array): LungBounds {
    let minX = this.shape[0], maxX = 0
    let minY = this.shape[1], maxY = 0
    let minZ = this.shape[2], maxZ = 0

    for (let i = 0; i < mask.length; i++) {
      if (mask[i] === 1) {
        const x = i % this.shape[0]
        const y = Math.floor(i / this.shape[0]) % this.shape[1]
        const z = Math.floor(i / (this.shape[0] * this.shape[1]))

        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
        minZ = Math.min(minZ, z)
        maxZ = Math.max(maxZ, z)
      }
    }

    return {
      min: { x: minX, y: minY, z: minZ, index: 0 },
      max: { x: maxX, y: maxY, z: maxZ, index: 0 },
      center: {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        z: (minZ + maxZ) / 2,
        index: 0
      }
    }
  }

  private getIndex(x: number, y: number, z: number): number {
    return z * this.shape[0] * this.shape[1] + y * this.shape[0] + x
  }

  private isInBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && x < this.shape[0] && y >= 0 && y < this.shape[1] && z >= 0 && z < this.shape[2]
  }

  public generateMeshData(mask: Uint8Array): MeshData {
    const vertices: number[] = []
    const normals: number[] = []
    const indices: number[] = []

    const visited = new Set<string>()

    for (let z = 0; z < this.shape[2] - 1; z++) {
      for (let y = 0; y < this.shape[1] - 1; y++) {
        for (let x = 0; x < this.shape[0] - 1; x++) {
          const idx = this.getIndex(x, y, z)
          if (mask[idx] === 1) {
            const key = `${x},${y},${z}`
            if (!visited.has(key)) {
              visited.add(key)

              this.addCubeForPoint(vertices, normals, indices, x, y, z)
            }
          }
        }
      }
    }

    return {
      positions: new Float32Array(vertices),
      normals: new Float32Array(normals),
      indices: new Uint16Array(indices),
      bounds: this.computeBounds(mask)
    }
  }

  private addCubeForPoint(vertices: number[], normals: number[], indices: number[], x: number, y: number, z: number): void {
    const baseIdx = vertices.length / 3

    const cubeSize = 0.5
    const corners = [
      [x - cubeSize, y - cubeSize, z - cubeSize],
      [x + cubeSize, y - cubeSize, z - cubeSize],
      [x + cubeSize, y + cubeSize, z - cubeSize],
      [x - cubeSize, y + cubeSize, z - cubeSize],
      [x - cubeSize, y - cubeSize, z + cubeSize],
      [x + cubeSize, y - cubeSize, z + cubeSize],
      [x + cubeSize, y + cubeSize, z + cubeSize],
      [x - cubeSize, y + cubeSize, z + cubeSize]
    ]

    for (const corner of corners) {
      vertices.push(...corner)
      normals.push(0, 0, 1)
    }

    const cubeFaces = [
      [0, 1, 2, 3],
      [5, 4, 7, 6],
      [4, 0, 3, 7],
      [1, 5, 6, 2],
      [3, 2, 6, 7],
      [4, 5, 1, 0]
    ]

    for (const face of cubeFaces) {
      indices.push(
        baseIdx + face[0], baseIdx + face[1], baseIdx + face[2],
        baseIdx + face[0], baseIdx + face[2], baseIdx + face[3]
      )
    }
  }
}

export function createLungSegmentation(config?: Partial<SegmentationConfig>): LungSegmentation {
  return new LungSegmentation(config)
}
