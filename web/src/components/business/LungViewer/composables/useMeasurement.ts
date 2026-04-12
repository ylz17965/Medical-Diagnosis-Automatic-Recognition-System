import { ref, computed, shallowRef } from 'vue'
import type { Measurement, MeasurementPoint, MeasurementResult } from '../types'
import { MEASUREMENT_COLORS, formatMeasurementValue, calculateDistance, calculateAngle } from '../types'

export function useMeasurement() {
  const measurements = shallowRef<Measurement[]>([])
  const activeTool = ref<'select' | 'distance' | 'angle' | 'ctvalue'>('select')
  const activeMeasurementId = ref<string | null>(null)
  const tempPoints = ref<MeasurementPoint[]>([])
  const showLabels = ref(true)
  const showValues = ref(true)
  const defaultColor = ref(MEASUREMENT_COLORS.distance)

  const measurementCount = computed(() => ({
    total: measurements.value.length,
    distance: measurements.value.filter((m) => m.type === 'distance').length,
    angle: measurements.value.filter((m) => m.type === 'angle').length,
    ctvalue: measurements.value.filter((m) => m.type === 'ctvalue').length
  }))

  function generateId(): string {
    return `measurement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  function addTempPoint(point: MeasurementPoint): void {
    tempPoints.value = [...tempPoints.value, point]
  }

  function clearTempPoints(): void {
    tempPoints.value = []
  }

  function addDistanceMeasurement(points: MeasurementPoint[]): Measurement | null {
    if (points.length < 2) return null

    const startPoint = points[0].position
    const endPoint = points[points.length - 1].position
    const distance = calculateDistance(startPoint, endPoint)

    const measurement: Measurement = {
      id: generateId(),
      type: 'distance',
      points,
      value: distance,
      unit: 'mm',
      visible: true,
      color: MEASUREMENT_COLORS.distance,
      lineWidth: 2,
      createdAt: new Date().toISOString()
    }

    measurements.value = [...measurements.value, measurement]
    clearTempPoints()
    return measurement
  }

  function addAngleMeasurement(points: MeasurementPoint[]): Measurement | null {
    if (points.length < 3) return null

    const vertex = points[1].position
    const startPoint = points[0].position
    const endPoint = points[2].position
    const angle = calculateAngle(startPoint, vertex, endPoint)

    const measurement: Measurement = {
      id: generateId(),
      type: 'angle',
      points,
      value: angle,
      unit: '°',
      visible: true,
      color: MEASUREMENT_COLORS.angle,
      lineWidth: 2,
      createdAt: new Date().toISOString()
    }

    measurements.value = [...measurements.value, measurement]
    clearTempPoints()
    return measurement
  }

  function addCtValueMeasurement(point: MeasurementPoint, ctValue: number): Measurement {
    const measurement: Measurement = {
      id: generateId(),
      type: 'ctvalue',
      points: [point],
      value: ctValue,
      unit: 'HU',
      visible: true,
      color: MEASUREMENT_COLORS.ctvalue,
      lineWidth: 2,
      createdAt: new Date().toISOString()
    }

    measurements.value = [...measurements.value, measurement]
    return measurement
  }

  function removeMeasurement(id: string): void {
    measurements.value = measurements.value.filter((m) => m.id !== id)
    if (activeMeasurementId.value === id) {
      activeMeasurementId.value = null
    }
  }

  function updateMeasurement(id: string, updates: Partial<Measurement>): void {
    measurements.value = measurements.value.map((m) =>
      m.id === id ? { ...m, ...updates } : m
    )
  }

  function selectMeasurement(id: string | null): void {
    activeMeasurementId.value = id
  }

  function toggleMeasurementVisibility(id: string): void {
    measurements.value = measurements.value.map((m) =>
      m.id === id ? { ...m, visible: !m.visible } : m
    )
  }

  function toggleAllLabels(): void {
    showLabels.value = !showLabels.value
  }

  function toggleAllValues(): void {
    showValues.value = !showValues.value
  }

  function clearAll(): void {
    measurements.value = []
    activeMeasurementId.value = null
    clearTempPoints()
  }

  function getMeasurementResults(): MeasurementResult[] {
    return measurements.value.map((m) => {
      let displayValue = formatMeasurementValue(m.value, m.type)

      if (m.type === 'distance' && m.points.length >= 2) {
        const start = m.points[0].position
        const end = m.points[m.points.length - 1].position
        displayValue = `${calculateDistance(start, end).toFixed(2)} mm`
      }

      if (m.type === 'angle' && m.points.length >= 3) {
        const vertex = m.points[1].position
        const start = m.points[0].position
        const end = m.points[2].position
        displayValue = `${calculateAngle(start, vertex, end).toFixed(1)}°`
      }

      if (m.type === 'ctvalue' && m.points.length >= 1) {
        displayValue = `${m.value.toFixed(0)} HU`
      }

      return {
        id: m.id,
        type: m.type,
        value: m.value,
        unit: m.unit,
        label: m.label || `${m.type}_${m.id.slice(-4)}`,
        points: m.points,
        displayValue
      }
    })
  }

  function getVisibleMeasurements(): Measurement[] {
    return measurements.value.filter((m) => m.visible)
  }

  function undo(): Measurement | null {
    if (measurements.value.length === 0) return null
    const last = measurements.value[measurements.value.length - 1]
    removeMeasurement(last.id)
    return last
  }

  function setActiveTool(tool: 'select' | 'distance' | 'angle' | 'ctvalue'): void {
    activeTool.value = tool
    clearTempPoints()
  }

  return {
    measurements,
    activeTool,
    activeMeasurementId,
    tempPoints,
    showLabels,
    showValues,
    defaultColor,
    measurementCount,
    addTempPoint,
    clearTempPoints,
    addDistanceMeasurement,
    addAngleMeasurement,
    addCtValueMeasurement,
    removeMeasurement,
    updateMeasurement,
    selectMeasurement,
    toggleMeasurementVisibility,
    toggleAllLabels,
    toggleAllValues,
    clearAll,
    getMeasurementResults,
    getVisibleMeasurements,
    undo,
    setActiveTool
  }
}
