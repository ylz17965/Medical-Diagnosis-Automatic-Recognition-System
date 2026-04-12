<script setup lang="ts">
import { computed } from 'vue'
import type { Nodule } from '../types'
import { RISK_LEVEL_CONFIG, NODULE_TYPE_CONFIG } from '../types'

interface Props {
  nodules: Nodule[]
  selectedId: string | null
  maxHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  maxHeight: '400px'
})

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'remove', id: string): void
  (e: 'toggleVisibility', id: string): void
  (e: 'confirm', id: string): void
}>()

const sortedNodules = computed(() => {
  return [...props.nodules].sort((a, b) => b.riskScore - a.riskScore)
})

function getRiskConfig(level: Nodule['riskLevel']) {
  return RISK_LEVEL_CONFIG[level]
}

function getTypeConfig(type: Nodule['type']) {
  return NODULE_TYPE_CONFIG[type]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="nodule-list" :style="{ maxHeight }">
    <div class="list-header">
      <h3>结节列表</h3>
      <span class="count">{{ nodules.length }} 个</span>
    </div>

    <div v-if="nodules.length === 0" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="4"/>
        <line x1="12" y1="2" x2="12" y2="4"/>
        <line x1="12" y1="20" x2="12" y2="22"/>
        <line x1="2" y1="12" x2="4" y2="12"/>
        <line x1="20" y1="12" x2="22" y2="12"/>
      </svg>
      <p>暂无结节</p>
      <span>点击添加或使用自动检测</span>
    </div>

    <div v-else class="list-content">
      <div
        v-for="nodule in sortedNodules"
        :key="nodule.id"
        class="nodule-item"
        :class="{
          selected: selectedId === nodule.id,
          confirmed: nodule.confirmed,
          hidden: !nodule.visible
        }"
        @click="emit('select', nodule.id)"
      >
        <div class="nodule-header">
          <div class="risk-badge" :style="{ backgroundColor: getRiskConfig(nodule.riskLevel).color }">
            {{ getRiskConfig(nodule.riskLevel).label }}
          </div>
          <div class="nodule-actions">
            <button
              class="action-btn"
              :title="nodule.visible ? '隐藏' : '显示'"
              @click.stop="emit('toggleVisibility', nodule.id)"
            >
              <svg v-if="nodule.visible" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
            <button
              v-if="!nodule.confirmed"
              class="action-btn confirm"
              title="确认结节"
              @click.stop="emit('confirm', nodule.id)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
            </button>
            <button
              class="action-btn remove"
              title="删除"
              @click.stop="emit('remove', nodule.id)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="nodule-body">
          <div class="info-row">
            <span class="label">位置</span>
            <span class="value">{{ nodule.location.lobe || '未知' }}</span>
          </div>
          <div class="info-row">
            <span class="label">大小</span>
            <span class="value highlight">{{ nodule.diameterMm.toFixed(1) }} mm</span>
          </div>
          <div class="info-row">
            <span class="label">类型</span>
            <span class="value">{{ getTypeConfig(nodule.type).label }}</span>
          </div>
          <div class="info-row">
            <span class="label">CT值</span>
            <span class="value">{{ nodule.ctValue.toFixed(0) }} HU</span>
          </div>
          <div class="info-row">
            <span class="label">风险评分</span>
            <div class="risk-score">
              <div class="score-bar">
                <div
                  class="score-fill"
                  :style="{
                    width: `${nodule.riskScore * 100}%`,
                    backgroundColor: getRiskConfig(nodule.riskLevel).color
                  }"
                />
              </div>
              <span class="score-value">{{ (nodule.riskScore * 100).toFixed(0) }}%</span>
            </div>
          </div>
        </div>

        <div class="nodule-footer">
          <span class="timestamp">{{ formatDate(nodule.createdAt) }}</span>
          <span v-if="nodule.confirmed" class="confirmed-badge">已确认</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nodule-list {
  display: flex;
  flex-direction: column;
  background: rgba(30, 41, 59, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  overflow: hidden;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(15, 23, 42, 0.5);
  border-bottom: 1px solid rgba(99, 102, 241, 0.2);
}

.list-header h3 {
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

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: #636366;
  text-align: center;
}

.empty-state svg {
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 14px;
  color: #94a3b8;
  margin: 0 0 4px 0;
}

.empty-state span {
  font-size: 12px;
}

.list-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.nodule-item {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.nodule-item:hover {
  border-color: rgba(99, 102, 241, 0.4);
  background: rgba(30, 41, 59, 0.8);
}

.nodule-item.selected {
  border-color: #818cf8;
  background: rgba(99, 102, 241, 0.15);
}

.nodule-item.hidden {
  opacity: 0.5;
}

.nodule-item.confirmed {
  border-left: 3px solid #4ade80;
}

.nodule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.risk-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: white;
}

.nodule-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 24px;
  height: 24px;
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

.action-btn.confirm:hover {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.action-btn.remove:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.nodule-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.info-row .label {
  color: #94a3b8;
}

.info-row .value {
  color: #e2e8f0;
}

.info-row .value.highlight {
  font-weight: 600;
  color: #818cf8;
}

.risk-score {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-bar {
  width: 60px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s;
}

.score-value {
  font-size: 11px;
  font-weight: 600;
  color: #e2e8f0;
  min-width: 32px;
  text-align: right;
}

.nodule-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(99, 102, 241, 0.1);
}

.timestamp {
  font-size: 10px;
  color: #636366;
}

.confirmed-badge {
  font-size: 10px;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
