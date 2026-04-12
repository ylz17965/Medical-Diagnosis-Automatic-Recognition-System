import * as THREE from 'three'
import { BRONCHUS_COLORS_BY_DEPTH, type BronchusNode } from '../types'

export interface BronchusMesh {
  node: BronchusNode
  mesh: THREE.Mesh | THREE.Group
  line: THREE.Line
}

interface BronchusNodeInput {
  id: string
  name: string
  depth: number
  diameter: number
  length: number
  position: [number, number, number]
  direction: [number, number, number]
  children: BronchusNodeInput[]
}

function createBronchusNode(input: BronchusNodeInput): BronchusNode {
  return {
    ...input,
    children: input.children.map(createBronchusNode),
    visible: true,
    expanded: true
  }
}

export class BronchialTree {
  private rootNode: BronchusNode | null = null
  private meshes: BronchusMesh[] = []
  private group: THREE.Group | null = null

  constructor() {
    this.rootNode = this.createDefaultBronchialTree()
  }

  private createDefaultBronchialTree(): BronchusNode {
    return createBronchusNode({
      id: 'trachea',
      name: '气管',
      depth: 0,
      diameter: 15,
      length: 100,
      position: [0, 0, 0],
      direction: [0, 0, 1],
      children: [
        {
          id: 'main_bronchus_right',
          name: '右主支气管',
          depth: 1,
          diameter: 12,
          length: 30,
          position: [5, 0, 100],
          direction: [0.3, 0, 1],
          children: [
            {
              id: 'upper_bronchus_right',
              name: '右上叶支气管',
              depth: 2,
              diameter: 8,
              length: 20,
              position: [15, 10, 130],
              direction: [0.5, 0.3, 1],
              children: [
                {
                  id: 'apical_segment_right',
                  name: '尖段支气管',
                  depth: 3,
                  diameter: 4,
                  length: 15,
                  position: [20, 15, 150],
                  direction: [0.6, 0.4, 1],
                  children: []
                },
                {
                  id: 'posterior_segment_right',
                  name: '后段支气管',
                  depth: 3,
                  diameter: 4,
                  length: 15,
                  position: [25, 5, 145],
                  direction: [0.8, 0, 1],
                  children: []
                },
                {
                  id: 'anterior_segment_right',
                  name: '前段支气管',
                  depth: 3,
                  diameter: 4,
                  length: 15,
                  position: [10, 20, 145],
                  direction: [0, 0.6, 1],
                  children: []
                }
              ]
            },
            {
              id: 'middle_bronchus_right',
              name: '右中叶支气管',
              depth: 2,
              diameter: 8,
              length: 20,
              position: [5, -10, 130],
              direction: [0, -0.3, 1],
              children: [
                {
                  id: 'lateral_segment_right',
                  name: '外侧段支气管',
                  depth: 3,
                  diameter: 3,
                  length: 12,
                  position: [0, -15, 150],
                  direction: [-0.3, -0.5, 1],
                  children: []
                },
                {
                  id: 'medial_segment_right',
                  name: '内侧段支气管',
                  depth: 3,
                  diameter: 3,
                  length: 12,
                  position: [10, -20, 150],
                  direction: [0.3, -0.5, 1],
                  children: []
                }
              ]
            },
            {
              id: 'lower_bronchus_right',
              name: '右下叶支气管',
              depth: 2,
              diameter: 10,
              length: 25,
              position: [0, -5, 130],
              direction: [0, -0.2, 1],
              children: [
                {
                  id: 'superior_segment_right',
                  name: '上段支气管',
                  depth: 3,
                  diameter: 6,
                  length: 18,
                  position: [-5, -10, 155],
                  direction: [-0.2, -0.4, 1],
                  children: []
                },
                {
                  id: 'basal_segments_right',
                  name: '基底段支气管',
                  depth: 3,
                  diameter: 5,
                  length: 15,
                  position: [0, -25, 155],
                  direction: [0, -0.8, 1],
                  children: []
                }
              ]
            }
          ]
        },
        {
          id: 'main_bronchus_left',
          name: '左主支气管',
          depth: 1,
          diameter: 12,
          length: 30,
          position: [-5, 0, 100],
          direction: [-0.3, 0, 1],
          children: [
            {
              id: 'upper_bronchus_left',
              name: '左上叶支气管',
              depth: 2,
              diameter: 8,
              length: 20,
              position: [-15, 10, 130],
              direction: [-0.5, 0.3, 1],
              children: [
                {
                  id: 'apicoposterior_segment_left',
                  name: '尖后段支气管',
                  depth: 3,
                  diameter: 4,
                  length: 15,
                  position: [-20, 15, 150],
                  direction: [-0.6, 0.4, 1],
                  children: []
                },
                {
                  id: 'anterior_segment_left',
                  name: '前段支气管',
                  depth: 3,
                  diameter: 4,
                  length: 15,
                  position: [-10, 20, 145],
                  direction: [0, 0.6, 1],
                  children: []
                },
                {
                  id: 'lingular_bronchus',
                  name: '舌段支气管',
                  depth: 3,
                  diameter: 4,
                  length: 15,
                  position: [-15, 5, 145],
                  direction: [-0.4, 0, 1],
                  children: []
                }
              ]
            },
            {
              id: 'lower_bronchus_left',
              name: '左下叶支气管',
              depth: 2,
              diameter: 10,
              length: 25,
              position: [0, -5, 130],
              direction: [0, -0.2, 1],
              children: [
                {
                  id: 'superior_segment_left',
                  name: '上段支气管',
                  depth: 3,
                  diameter: 6,
                  length: 18,
                  position: [-5, -10, 155],
                  direction: [-0.2, -0.4, 1],
                  children: []
                },
                {
                  id: 'basal_segments_left',
                  name: '基底段支气管',
                  depth: 3,
                  diameter: 5,
                  length: 15,
                  position: [-5, -25, 155],
                  direction: [0, -0.8, 1],
                  children: []
                }
              ]
            }
          ]
        }
      ]
    })
  }

  public setTreeData(rootNode: BronchusNode): void {
    this.rootNode = rootNode
    this.rebuild()
  }

  public getTreeData(): BronchusNode | null {
    return this.rootNode
  }

  private rebuild(): void {
    this.clear()
    if (this.rootNode) {
      this.buildMeshes(this.rootNode)
    }
  }

  private buildMeshes(node: BronchusNode, parentEndPoint?: THREE.Vector3): void {
    const startPoint = parentEndPoint || new THREE.Vector3(...node.position)
    const endPoint = new THREE.Vector3(
      node.position[0] + node.direction[0] * node.length,
      node.position[1] + node.direction[1] * node.length,
      node.position[2] + node.direction[2] * node.length
    )

    const line = this.createBranch(startPoint, endPoint, node.depth)
    this.group?.add(line)

    const mesh = this.createNodeMarker(endPoint, node.diameter, node.depth)
    this.group?.add(mesh)

    this.meshes.push({
      node,
      mesh,
      line
    })

    if (node.expanded && node.children.length > 0) {
      node.children.forEach((child) => {
        this.buildMeshes(child, endPoint)
      })
    }
  }

  private createBranch(start: THREE.Vector3, end: THREE.Vector3, depth: number): THREE.Line {
    const points = [start, end]
    const geometry = new THREE.BufferGeometry().setFromPoints(points)

    const colorIndex = Math.min(depth, BRONCHUS_COLORS_BY_DEPTH.length - 1)
    const material = new THREE.LineBasicMaterial({
      color: BRONCHUS_COLORS_BY_DEPTH[colorIndex],
      transparent: true,
      opacity: 0.8
    })

    return new THREE.Line(geometry, material)
  }

  private createNodeMarker(position: THREE.Vector3, diameter: number, depth: number): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(diameter / 2, 16, 16)
    const colorIndex = Math.min(depth, BRONCHUS_COLORS_BY_DEPTH.length - 1)

    const material = new THREE.MeshStandardMaterial({
      color: BRONCHUS_COLORS_BY_DEPTH[colorIndex],
      transparent: true,
      opacity: 0.9,
      emissive: BRONCHUS_COLORS_BY_DEPTH[colorIndex],
      emissiveIntensity: 0.1
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(position)

    return mesh
  }

  public getGroup(): THREE.Group {
    if (!this.group) {
      this.group = new THREE.Group()
      this.group.name = 'BronchialTree'
      this.rebuild()
    }
    return this.group
  }

  public setNodeVisibility(nodeId: string, visible: boolean): void {
    const meshData = this.meshes.find((m) => m.node.id === nodeId)
    if (meshData) {
      meshData.mesh.visible = visible
      meshData.line.visible = visible
    }

    const updateChildren = (node: BronchusNode) => {
      node.children.forEach((child) => {
        const childMesh = this.meshes.find((m) => m.node.id === child.id)
        if (childMesh) {
          childMesh.mesh.visible = visible
          childMesh.line.visible = visible
        }
        updateChildren(child)
      })
    }

    const findNode = (node: BronchusNode): BronchusNode | null => {
      if (node.id === nodeId) return node
      for (const child of node.children) {
        const found = findNode(child)
        if (found) return found
      }
      return null
    }

    if (this.rootNode) {
      const targetNode = findNode(this.rootNode)
      if (targetNode) {
        updateChildren(targetNode)
      }
    }
  }

  public expandNode(nodeId: string): void {
    const findAndUpdate = (node: BronchusNode): boolean => {
      if (node.id === nodeId) {
        node.expanded = true
        return true
      }
      for (const child of node.children) {
        if (findAndUpdate(child)) return true
      }
      return false
    }

    if (this.rootNode) {
      findAndUpdate(this.rootNode)
      this.rebuild()
    }
  }

  public collapseNode(nodeId: string): void {
    const findAndUpdate = (node: BronchusNode): boolean => {
      if (node.id === nodeId) {
        node.expanded = false
        return true
      }
      for (const child of node.children) {
        if (findAndUpdate(child)) return true
      }
      return false
    }

    if (this.rootNode) {
      findAndUpdate(this.rootNode)
      this.rebuild()
    }
  }

  public highlightNode(nodeId: string, highlight: boolean): void {
    const meshData = this.meshes.find((m) => m.node.id === nodeId)
    if (meshData && meshData.mesh instanceof THREE.Mesh) {
      const material = meshData.mesh.material as THREE.MeshStandardMaterial
      material.emissiveIntensity = highlight ? 0.5 : 0.1
    }
  }

  public setOpacity(opacity: number): void {
    this.meshes.forEach((meshData) => {
      if (meshData.mesh instanceof THREE.Mesh) {
        const material = meshData.mesh.material as THREE.MeshStandardMaterial
        material.opacity = opacity
      }
      if (meshData.line.material instanceof THREE.LineBasicMaterial) {
        (meshData.line.material as THREE.LineBasicMaterial).opacity = opacity
      }
    })
  }

  public setMaxDepth(_depth: number): void {
  }

  private clear(): void {
    if (this.group) {
      while (this.group.children.length > 0) {
        const child = this.group.children[0]
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          if (child.material instanceof THREE.Material) {
            child.material.dispose()
          }
        } else if (child instanceof THREE.Line) {
          child.geometry.dispose()
          if (child.material instanceof THREE.Material) {
            child.material.dispose()
          }
        }
        this.group.remove(child)
      }
    }
    this.meshes = []
  }

  public dispose(): void {
    this.clear()
    this.group = null
    this.rootNode = null
  }
}

export function createBronchialTree(): BronchialTree {
  return new BronchialTree()
}
