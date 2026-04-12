import type { Point3D, AirwayNode, AirwayTree, SegmentationConfig } from '../types/segmentation'
import { DEFAULT_SEGMENTATION_CONFIG } from '../types/segmentation'

export class AirwayExtraction {
  private volumeData: Float32Array | null = null
  private shape: [number, number, number] = [0, 0, 0]
  private spacing: [number, number, number] = [1, 1, 1]
  private config: SegmentationConfig

  constructor(config?: Partial<SegmentationConfig>) {
    this.config = { ...DEFAULT_SEGMENTATION_CONFIG, ...config }
  }

  public setVolume(
    volumeData: Float32Array,
    shape: [number, number, number],
    spacing: [number, number, number]
  ): void {
    this.volumeData = volumeData
    this.shape = shape
    this.spacing = spacing
  }

  public findTracheaSeedPoint(): Point3D | null {
    if (!this.volumeData) return null

    const middleZ = Math.floor(this.shape[2] / 2)
    let maxX = 0
    let seedPoint: Point3D | null = null

    for (let z = Math.max(0, middleZ - 20); z < Math.min(this.shape[2], middleZ + 20); z++) {
      for (let y = 0; y < this.shape[1]; y++) {
        for (let x = 0; x < this.shape[0]; x++) {
          const idx = this.getIndex(x, y, z)
          const hu = this.volumeData![idx]

          if (hu < -900 && hu > -1000) {
            if (x > maxX) {
              maxX = x
              seedPoint = { x, y, z, index: idx }
            }
          }
        }
      }
    }

    return seedPoint
  }

  public extract(seedPoint?: Point3D): AirwayTree {
    if (!this.volumeData) {
      throw new Error('Volume data not set')
    }

    const startPoint = seedPoint || this.findTracheaSeedPoint()
    if (!startPoint) {
      throw new Error('Could not find seed point for airway extraction')
    }

    const airwayMask = new Uint8Array(this.volumeData.length)
    const root: AirwayNode = {
      point: startPoint,
      radius: this.estimateRadius(startPoint),
      generation: 0,
      children: [],
      parent: null
    }

    airwayMask[startPoint.index] = 1

    const queue: AirwayNode[] = [root]
    const nodesByGeneration = new Map<number, AirwayNode[]>()
    nodesByGeneration.set(0, [root])

    while (queue.length > 0) {
      const current = queue.shift()!

      if (current.generation >= this.config.maxAirwayGeneration) {
        continue
      }

      const neighbors = this.get26Neighbors(current.point)

      for (const neighbor of neighbors) {
        if (this.isAirway(neighbor) && airwayMask[neighbor.index] === 0) {
          airwayMask[neighbor.index] = 1

          const childRadius = this.estimateRadius(neighbor)
          if (childRadius < 0.5) continue

          const child: AirwayNode = {
            point: neighbor,
            radius: childRadius,
            generation: current.generation + 1,
            children: [],
            parent: current
          }

          current.children.push(child)
          queue.push(child)

          if (!nodesByGeneration.has(child.generation)) {
            nodesByGeneration.set(child.generation, [])
          }
          nodesByGeneration.get(child.generation)!.push(child)
        }
      }
    }

    return {
      root,
      totalNodes: this.countNodes(root),
      maxGeneration: this.findMaxGeneration(root),
      nodesByGeneration
    }
  }

  private isAirway(point: Point3D): boolean {
    if (!this.isInBounds(point.x, point.y, point.z)) {
      return false
    }

    const idx = this.getIndex(point.x, point.y, point.z)
    const hu = this.volumeData![idx]

    return hu < this.config.airwayThreshold && hu > this.config.lungMinThreshold
  }

  private estimateRadius(point: Point3D): number {
    let minX = point.x, maxX = point.x
    let minY = point.y, maxY = point.y

    for (let dz = -3; dz <= 3; dz++) {
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const nx = point.x + dx
          const ny = point.y + dy
          const nz = point.z + dz

          if (this.isInBounds(nx, ny, nz)) {
            const idx = this.getIndex(nx, ny, nz)
            if (this.volumeData![idx] < this.config.airwayThreshold) {
              minX = Math.min(minX, nx)
              maxX = Math.max(maxX, nx)
              minY = Math.min(minY, ny)
              maxY = Math.max(maxY, ny)
            }
          }
        }
      }
    }

    const radiusX = (maxX - minX) / 2
    const radiusY = (maxY - minY) / 2

    return Math.max(radiusX, radiusY, 1)
  }

  private get26Neighbors(point: Point3D): Point3D[] {
    const neighbors: Point3D[] = []

    for (let dz = -1; dz <= 1; dz++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0 && dz === 0) continue

          const nx = point.x + dx
          const ny = point.y + dy
          const nz = point.z + dz

          if (this.isInBounds(nx, ny, nz)) {
            neighbors.push({
              x: nx,
              y: ny,
              z: nz,
              index: this.getIndex(nx, ny, nz)
            })
          }
        }
      }
    }

    return neighbors
  }

  private getIndex(x: number, y: number, z: number): number {
    return z * this.shape[0] * this.shape[1] + y * this.shape[0] + x
  }

  private isInBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && x < this.shape[0] && y >= 0 && y < this.shape[1] && z >= 0 && z < this.shape[2]
  }

  private countNodes(node: AirwayNode): number {
    let count = 1
    for (const child of node.children) {
      count += this.countNodes(child)
    }
    return count
  }

  private findMaxGeneration(node: AirwayNode): number {
    let maxGen = node.generation
    for (const child of node.children) {
      maxGen = Math.max(maxGen, this.findMaxGeneration(child))
    }
    return maxGen
  }

  public generateTubeGeometry(tree: AirwayTree, segments: number = 6): {
    positions: Float32Array
    indices: Uint16Array
    normals: Float32Array
  } {
    const positions: number[] = []
    const normals: number[] = []
    const indices: number[] = []

    let vertexOffset = 0

    const processNode = (node: AirwayNode, parentNode: AirwayNode | null): void => {
      const centerX = node.point.x * this.spacing[0]
      const centerY = node.point.y * this.spacing[1]
      const centerZ = node.point.z * this.spacing[2]

      const nodeRingIndices: number[] = []

      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2
        const nx = Math.cos(angle)
        const ny = Math.sin(angle)

        positions.push(centerX + node.radius * nx, centerY + node.radius * ny, centerZ)
        normals.push(nx, ny, 0)
        nodeRingIndices.push(vertexOffset++)
      }

      if (parentNode) {
        const parentCenterX = parentNode.point.x * this.spacing[0]
        const parentCenterY = parentNode.point.y * this.spacing[1]
        const parentCenterZ = parentNode.point.z * this.spacing[2]

        const parentRingIndices: number[] = []

        for (let i = 0; i < segments; i++) {
          const angle = (i / segments) * Math.PI * 2
          const nx = Math.cos(angle)
          const ny = Math.sin(angle)

          positions.push(parentCenterX + parentNode.radius * nx, parentCenterY + parentNode.radius * ny, parentCenterZ)
          normals.push(nx, ny, 0)
          parentRingIndices.push(vertexOffset++)
        }

        for (let i = 0; i < segments; i++) {
          const next = (i + 1) % segments
          indices.push(
            parentRingIndices[i], parentRingIndices[next], nodeRingIndices[i],
            parentRingIndices[next], nodeRingIndices[next], nodeRingIndices[i]
          )
        }
      }

      for (const child of node.children) {
        processNode(child, node)
      }
    }

    processNode(tree.root, null)

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      indices: new Uint16Array(indices)
    }
  }
}

export function createAirwayExtraction(config?: Partial<SegmentationConfig>): AirwayExtraction {
  return new AirwayExtraction(config)
}
