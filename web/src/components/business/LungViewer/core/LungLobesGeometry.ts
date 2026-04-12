import * as THREE from 'three'
import { LUNG_LOBE_DEFINITIONS, type LungLobe } from '../types'

export interface LungLobeMesh {
  id: string
  name: string
  mesh: THREE.Mesh
  lobe: LungLobe
}

export class LungLobesGeometry {
  private lobes: LungLobeMesh[] = []
  private group: THREE.Group | null = null

  constructor() {
    this.createLobeMeshes()
  }

  private createLobeMeshes(): void {
    this.group = new THREE.Group()

    LUNG_LOBE_DEFINITIONS.forEach((lobeDef) => {
      const lobe = { ...lobeDef, geometry: undefined } as LungLobe

      const mesh = this.createLobeMesh(lobeDef)
      mesh.name = lobeDef.id

      this.lobes.push({
        id: lobeDef.id,
        name: lobeDef.name,
        mesh,
        lobe
      })

      this.group!.add(mesh)
    })
  }

  private createLobeMesh(lobeDef: Omit<LungLobe, 'geometry'>): THREE.Mesh {
    const { bounds, color, opacity } = lobeDef

    const min = new THREE.Vector3(...bounds.min)
    const max = new THREE.Vector3(...bounds.max)
    const size = new THREE.Vector3().subVectors(max, min)
    const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5)

    const geometry = new THREE.SphereGeometry(
      Math.max(size.x, size.y, size.z) / 2,
      32,
      32
    )

    geometry.translate(center.x, center.y, center.z)

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.userData.lobeId = lobeDef.id
    mesh.userData.lobeName = lobeDef.name

    return mesh
  }

  public getLobe(id: string): LungLobeMesh | undefined {
    return this.lobes.find((l) => l.id === id)
  }

  public getAllLobes(): LungLobeMesh[] {
    return [...this.lobes]
  }

  public getGroup(): THREE.Group {
    if (!this.group) {
      this.createLobeMeshes()
    }
    return this.group!
  }

  public setLobeVisibility(id: string, visible: boolean): void {
    const lobe = this.getLobe(id)
    if (lobe) {
      lobe.mesh.visible = visible
    }
  }

  public setLobeOpacity(id: string, opacity: number): void {
    const lobe = this.getLobe(id)
    if (lobe && lobe.mesh.material instanceof THREE.MeshStandardMaterial) {
      lobe.mesh.material.opacity = Math.max(0, Math.min(1, opacity))
    }
  }

  public setLobeColor(id: string, color: string): void {
    const lobe = this.getLobe(id)
    if (lobe && lobe.mesh.material instanceof THREE.MeshStandardMaterial) {
      lobe.mesh.material.color.set(color)
    }
  }

  public highlightLobe(id: string, highlight: boolean): void {
    const lobe = this.getLobe(id)
    if (lobe && lobe.mesh.material instanceof THREE.MeshStandardMaterial) {
      if (highlight) {
        lobe.mesh.material.emissive.set(lobe.mesh.material.color)
        lobe.mesh.material.emissiveIntensity = 0.3
      } else {
        lobe.mesh.material.emissive.set(0x000000)
        lobe.mesh.material.emissiveIntensity = 0
      }
    }
  }

  public selectLobe(id: string): void {
    this.lobes.forEach((lobe) => {
      this.highlightLobe(lobe.id, lobe.id === id)
    })
  }

  public deselectAll(): void {
    this.lobes.forEach((lobe) => {
      this.highlightLobe(lobe.id, false)
    })
  }

  public dispose(): void {
    this.lobes.forEach((lobe) => {
      lobe.mesh.geometry.dispose()
      if (lobe.mesh.material instanceof THREE.Material) {
        lobe.mesh.material.dispose()
      }
    })
    this.lobes = []
    this.group = null
  }
}

export function createLungLobesScene(): THREE.Group {
  const lungLobes = new LungLobesGeometry()
  return lungLobes.getGroup()
}
