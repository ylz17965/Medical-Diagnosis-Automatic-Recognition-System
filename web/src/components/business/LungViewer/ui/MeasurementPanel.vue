<script setup lang="ts">
import { computed } from 'vue'
import type { Measurement } from '../types'

interface Props {
  measurements: Measurement[]
  activeTool: 'select' | 'distance' | 'angle' | 'ctvalue'
  showLabels: boolean
  showValues: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showLabels: true,
  showValues: true
})

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'remove', id: string): void
  (e: 'toggleVisibility', id: string): void
  (e: 'toggleLabels'): void
  (e: 'toggleValues'): void
  (e: 'clearAll'): void
  (e: 'toolChange', tool: 'select' | 'distance' | 'angle' | 'ctvalue'): void
}>()

const sortedMeasurements = computed(() => {
  return [...props.measurements].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
})

function getTypeLabel(type: Measurement['type']): string {
  switch (type) {
    case 'distance': return '距离'
    case 'angle': return '角度'
    case 'ctvalue': return 'CT值'
    case 'area': return '面积'
    case 'volume': return '体积'
    default: return type
  }
}

function formatValue(measurement: Measurement): string {
  switch (measurement.type) {
    case 'distance':
      return `${measurement.value.toFixed(2)} mm`
    case 'angle':
      return `${measurement.value.toFixed(1)}°`
    case 'ctvalue':
      return `${measurement.value.toFixed(0)} HU`
    case 'area':
      return `${measurement.value.toFixed(2)} mm²`
    case 'volume':
      return `${measurement.value.toFixed(2)} mm³`
    default:
      return measurement.value.toFixed(2)
  }
}
</script>

<template>
  <div class="measurement-panel">
    <div class="panel-header">
      <h3>测量工具</h3>
      <span class="count">{{ measurements.length }} 项</span>
    </div>

    <div class="tool-selector">
      <button
        class="tool-btn"
        :class="{ active: activeTool === 'select' }"
        @click="emit('toolChange', 'select')"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
        </svg>
        选择
      </button>
      <button
        class="tool-btn"
        :class="{ active: activeTool === 'distance' }"
        @click="emit('toolChange', 'distance')"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
          <path d="M22 12A10 10 0 0 0 12 2v10z"/>
        </svg>
        距离
      </button>
      <button
        class="tool-btn"
        :class="{ active: activeTool === 'angle' }"
        @click="emit('toolChange', 'angle')"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 22h20L12 2z"/>
        </svg>
        角度
      </button>
      <button
        class="tool-btn"
        :class="{ active: activeTool === 'ctvalue' }"
        @click="emit('toolChange', 'ctvalue')"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        CT值
      </button>
    </div>

    <div class="display-options">
      <button
        class="option-btn"
        :class="{ active: showLabels }"
        @click="emit('toggleLabels')"
      >
        {{ showLabels ? '隐藏' : '显示' }}标签
      </button>
      <button
        class="option-btn"
        :class="{ active: showValues }"
        @click="emit('toggleValues')"
      >
        {{ showValues ? '隐藏' : '显示' }}数值
      </button>
    </div>

    <div class="measurements-list">
      <div v-if="measurements.length === 0" class="empty-state">
        <p>暂无测量</p>
        <span>选择测量工具后在图像上点击添加</span>
      </div>

      <div
        v-for="measurement in sortedMeasurements"
        :key="measurement.id"
        class="measurement-item"
        :class="{ selected: false }"
        @click="emit('select', measurement.id)"
      >
        <div class="measurement-info">
          <span class="type-badge" :style="{ backgroundColor: measurement.color }">
            {{ getTypeLabel(measurement.type) }}
          </span>
          <span class="value">{{ formatValue(measurement) }}</span>
        </div>

        <div class="measurement-actions">
          <button
            class="action-btn"
            :title="measurement.visible ? '隐藏' : '显示'"
            @click.stop="emit('toggleVisibility', measurement.id)"
          >
            <svg v-if="measurement.visible" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          </button>
          <button
            class="action-btn remove"
            title="删除"
            @click.stop="emit('remove', measurement.id)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="panel-footer">
      <button
        class="clear-btn"
        :disabled="measurements.length === 0"
        @click="emit('clearAll')"
      >
        清除全部
      </button>
    </div>
  </div>
</template>

<style scoped>
.measurement-panel {
  display: flex;
  flex-direction: column;
  background: rgba(30, 41, 59, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(15, 23, 42, 0.5);
  border-bottom: 1px solid rgba(99, 102, 241, 0.2);
}

.panel-header h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: #e2e8f0;
}

.count {
  font-size: 12px;
  color: #94a3b8;
  background: rgba(99, 102, 241, 0.2);
  padding: 2px 8px;
  border-radius: 12px;
}

.tool-selector {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid rgba(99, 102, 241, 0.1);
}

.tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #94a3b8;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-btn:hover {
  background: rgba(99, 102, 241, 0.1);
  color: #e2e8f0;
}

.tool-btn.active {
  background: rgba(99, 102, 241, 0.2);
  border-color: #818cf8;
  color: #818cf8;
}

.display-options {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(99, 102, 241, 0.1);
}

.option-btn {
  flex: 1;
  padding: 4px 8px;
  background: transparent;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 4px;
  color: #94a3b8;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-btn:hover {
  background: rgba(99, 102, 241, 0.1);
}

.option-btn.active {
  background: rgba(99, 102, 241, 0.2);
  border-color: #818cf8;
  color: #818cf8;
}

.measurements-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  max-height: 200px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #636366;
  text-align: center;
}

.empty-state p {
  font-size: 13px;
  color: #94a3b8;
  margin: 0 0 4px 0;
}

.empty-state span {
  font-size: 11px;
}

.measurement-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 6px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.measurement-item:hover {
  border-color: rgba(99, 102, 241, 0.4);
}

.measurement-item.selected {
  border-color: #818cf8;
  background: rgba(99, 102, 241, 0.15);
}

.measurement-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  color: white;
}

.value {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
  font-family: monospace;
}

.measurement-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(99, 102, 241, 0.2);
  color: #e2e8f0;
}

.action-btn.remove:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.panel-footer {
  padding: 8px 12px;
  border-top: 1px solid rgba(99, 102, 241, 0.1);
}

.clear-btn {
  width: 100%;
  padding: 8px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 6px;
  color: #f87171;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.2);
}

.clear-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
