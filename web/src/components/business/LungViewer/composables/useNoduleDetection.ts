import { ref, computed, shallowRef } from 'vue'
import type { Nodule, Nodule3DMarker, NoduleDetectionSettings, NoduleListItem } from '../types'
import { RISK_LEVEL_CONFIG, calculateRiskScore, determineRiskLevel } from '../types'

export function useNoduleDetection() {
  const nodules = shallowRef<Nodule[]>([])
  const markers = shallowRef<Nodule3DMarker[]>([])
  const selectedNoduleId = ref<string | null>(null)
  const settings = ref<NoduleDetectionSettings>({
    minDiameter: 3,
    maxDiameter: 30,
    minCtValue: -750,
    maxCtValue: 400,
    sensitivity: 0.5,
    autoDetect: false
  })

  const nodulesByLobe = computed(() => {
    const grouped: Record<string, Nodule[]> = {}
    nodules.value.forEach((nodule) => {
      const lobe = nodule.location.lobe || 'unknown'
      if (!grouped[lobe]) {
        grouped[lobe] = []
      }
      grouped[lobe].push(nodule)
    })
    return grouped
  })

  const nodulesByRisk = computed(() => {
    return {
      low: nodules.value.filter((n) => n.riskLevel === 'low'),
      medium: nodules.value.filter((n) => n.riskLevel === 'medium'),
      high: nodules.value.filter((n) => n.riskLevel === 'high')
    }
  })

  const summary = computed(() => ({
    total: nodules.value.length,
    low: nodulesByRisk.value.low.length,
    medium: nodulesByRisk.value.medium.length,
    high: nodulesByRisk.value.high.length
  }))

  function generateId(): string {
    return `nodule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  function createNodule(data: Partial<Nodule>): Nodule {
    const id = generateId()
    const diameter = data.diameter || 5
    const diameterMm = data.diameterMm || diameter * 1.5
    const volume = (4 / 3) * Math.PI * Math.pow(diameterMm / 2, 3)

    const riskScore = calculateRiskScore({
      diameter: diameterMm,
      type: data.type,
      margin: data.margin,
      growthRate: data.growthRate
    })

    const nodule: Nodule = {
      id,
      position: data.position || [0, 0, 0],
      sliceIndex: data.sliceIndex || 0,
      location: data.location || { lobe: 'unknown' },
      diameter,
      diameterMm,
      volume,
      ctValue: data.ctValue || 0,
      ctValueRange: data.ctValueRange || [0, 0],
      riskLevel: determineRiskLevel(riskScore),
      riskScore,
      type: data.type || 'solid',
      margin: data.margin || 'smooth',
      visible: true,
      selected: false,
      confirmed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return nodule
  }

  function addNodule(data: Partial<Nodule>): Nodule {
    const nodule = createNodule(data)
    nodules.value = [...nodules.value, nodule]
    updateMarker(nodule)
    return nodule
  }

  function removeNodule(id: string): void {
    nodules.value = nodules.value.filter((n) => n.id !== id)
    markers.value = markers.value.filter((m) => m.id !== id)
    if (selectedNoduleId.value === id) {
      selectedNoduleId.value = null
    }
  }

  function updateNodule(id: string, updates: Partial<Nodule>): void {
    nodules.value = nodules.value.map((n) => {
      if (n.id === id) {
        const updated = { ...n, ...updates, updatedAt: new Date().toISOString() }

        if (updates.diameter || updates.type || updates.margin || updates.growthRate) {
          const riskScore = calculateRiskScore({
            diameter: updates.diameterMm || updated.diameterMm,
            type: updates.type || updated.type,
            margin: updates.margin || updated.margin,
            growthRate: updates.growthRate || updated.growthRate
          })
          updated.riskScore = riskScore
          updated.riskLevel = determineRiskLevel(riskScore)
        }

        updateMarker(updated)
        return updated
      }
      return n
    })
  }

  function updateMarker(nodule: Nodule): void {
    const existingIndex = markers.value.findIndex((m) => m.id === nodule.id)
    const config = RISK_LEVEL_CONFIG[nodule.riskLevel]

    const marker: Nodule3DMarker = {
      id: nodule.id,
      position: nodule.position,
      radius: nodule.diameterMm / 2,
      color: config.color,
      opacity: 0.7,
      visible: nodule.visible,
      selected: nodule.selected
    }

    if (existingIndex >= 0) {
      markers.value = markers.value.map((m, i) => (i === existingIndex ? marker : m))
    } else {
      markers.value = [...markers.value, marker]
    }
  }

  function selectNodule(id: string | null): void {
    selectedNoduleId.value = id
    nodules.value = nodules.value.map((n) => ({
      ...n,
      selected: n.id === id
    }))
    markers.value = markers.value.map((m) => ({
      ...m,
      selected: m.id === id
    }))
  }

  function toggleNoduleVisibility(id: string): void {
    nodules.value = nodules.value.map((n) => {
      if (n.id === id) {
        const updated = { ...n, visible: !n.visible }
        markers.value = markers.value.map((m) =>
          m.id === id ? { ...m, visible: updated.visible } : m
        )
        return updated
      }
      return n
    })
  }

  function confirmNodule(id: string): void {
    updateNodule(id, { confirmed: true })
  }

  function getNoduleList(): NoduleListItem[] {
    return nodules.value.map((n) => ({
      id: n.id,
      lobe: n.location.lobe || 'unknown',
      diameter: `${n.diameterMm.toFixed(1)} mm`,
      riskLevel: n.riskLevel,
      riskScore: n.riskScore,
      visible: n.visible,
      selected: n.selected
    }))
  }

  function getSelectedNodule(): Nodule | null {
    if (!selectedNoduleId.value) return null
    return nodules.value.find((n) => n.id === selectedNoduleId.value) || null
  }

  function clearAll(): void {
    nodules.value = []
    markers.value = []
    selectedNoduleId.value = null
  }

  function autoDetect(volumeData: Float32Array, shape: [number, number, number]): Nodule[] {
    const detectedNodules: Nodule[] = []
    const { minDiameter, maxDiameter, minCtValue, maxCtValue, sensitivity } = settings.value

    const threshold = -300 + (1 - sensitivity) * 400

    for (let z = 0; z < shape[2]; z += 5) {
      for (let y = 0; y < shape[1]; y += 5) {
        for (let x = 0; x < shape[0]; x += 5) {
          const idx = z * shape[0] * shape[1] + y * shape[0] + x

          if (idx >= volumeData.length) continue

          const value = volumeData[idx]

          if (value < minCtValue || value > maxCtValue) continue
          if (value > threshold) continue

          let isNoduleLike = true
          let surroundingSum = 0
          let surroundingCount = 0

          for (let dz = -2; dz <= 2; dz++) {
            for (let dy = -2; dy <= 2; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                const nidx = (z + dz) * shape[0] * shape[1] + (y + dy) * shape[0] + (x + dx)
                if (nidx >= 0 && nidx < volumeData.length && Math.abs(dx) + Math.abs(dy) + Math.abs(dz) <= 2) {
                  surroundingSum += volumeData[nidx]
                  surroundingCount++
                }
              }
            }
          }

          const avgSurrounding = surroundingCount > 0 ? surroundingSum / surroundingCount : 0

          if (avgSurrounding < -700) {
            isNoduleLike = false
          }

          if (isNoduleLike) {
            const nodule = createNodule({
              position: [x, y, z],
              sliceIndex: z,
              ctValue: value,
              location: { lobe: 'unknown' }
            })

            if (nodule.diameterMm >= minDiameter && nodule.diameterMm <= maxDiameter) {
              detectedNodules.push(nodule)
            }
          }
        }
      }
    }

    nodules.value = [...nodules.value, ...detectedNodules]
    detectedNodules.forEach(updateMarker)

    return detectedNodules
  }

  return {
    nodules,
    markers,
    selectedNoduleId,
    settings,
    nodulesByLobe,
    nodulesByRisk,
    summary,
    addNodule,
    removeNodule,
    updateNodule,
    selectNodule,
    toggleNoduleVisibility,
    confirmNodule,
    getNoduleList,
    getSelectedNodule,
    clearAll,
    autoDetect
  }
}
