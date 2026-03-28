<script setup lang="ts">
import { computed } from 'vue'
import IconAlertTriangle from '@/components/icons/IconAlertTriangle.vue'

interface Indicator {
  name: string
  value: string
  unit?: string
  normalRange: string
  isAbnormal: boolean
}

interface Props {
  reportType: string
  reportDate?: string
  indicators: Indicator[]
  summary: string
  disclaimer?: string
}

const props = withDefaults(defineProps<Props>(), {
  reportDate: '',
  disclaimer: 'AI生成内容仅供参考，不构成诊断建议。如有疑问请咨询专业医生。'
})

defineEmits<{
  indicatorClick: [indicator: Indicator]
}>()

const abnormalCount = computed(() => 
  props.indicators.filter(i => i.isAbnormal).length
)
</script>

<template>
  <div class="report-card">
    <div class="report-header">
      <div class="report-type">
        <span class="type-label">报告类型</span>
        <span class="type-value">{{ reportType }}</span>
      </div>
      <div v-if="reportDate" class="report-date">
        {{ reportDate }}
      </div>
    </div>

    <div v-if="abnormalCount > 0" class="report-alert">
      <IconAlertTriangle class="alert-icon" />
      <span>发现 {{ abnormalCount }} 项异常指标，请关注</span>
    </div>

    <div class="report-indicators">
      <table class="indicators-table">
        <thead>
          <tr>
            <th>指标名称</th>
            <th>检测值</th>
            <th>正常范围</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(indicator, index) in indicators"
            :key="index"
            :class="{ 'is-abnormal': indicator.isAbnormal }"
            @click="$emit('indicatorClick', indicator)"
          >
            <td class="indicator-name">{{ indicator.name }}</td>
            <td class="indicator-value">
              {{ indicator.value }}
              <span v-if="indicator.unit" class="unit">{{ indicator.unit }}</span>
            </td>
            <td class="indicator-range">{{ indicator.normalRange }}</td>
            <td class="indicator-status">
              <span :class="['status-badge', indicator.isAbnormal ? 'abnormal' : 'normal']">
                {{ indicator.isAbnormal ? '异常' : '正常' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="report-summary">
      <h4 class="summary-title">分析总结</h4>
      <p class="summary-content">{{ summary }}</p>
    </div>

    <div class="report-disclaimer">
      <IconAlertTriangle class="disclaimer-icon" />
      <span>{{ disclaimer }}</span>
    </div>
  </div>
</template>

<style scoped>
.report-card {
  background-color: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4) var(--spacing-5);
  background-color: var(--color-primary-bg);
  border-bottom: 1px solid var(--color-border);
}

.report-type {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.type-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.type-value {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.report-date {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.report-alert {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-5);
  background-color: var(--color-warning-bg);
  color: var(--color-warning-dark);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.alert-icon {
  width: 18px;
  height: 18px;
  color: var(--color-warning);
}

.report-indicators {
  padding: var(--spacing-4) var(--spacing-5);
  overflow-x: auto;
}

.indicators-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.indicators-table th,
.indicators-table td {
  padding: var(--spacing-3) var(--spacing-4);
  text-align: left;
  border-bottom: 1px solid var(--color-border-light);
}

.indicators-table th {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  background-color: var(--color-bg-tertiary);
}

.indicators-table tbody tr {
  transition: background-color var(--transition-fast);
}

.indicators-table tbody tr:hover {
  background-color: var(--color-surface-hover);
  cursor: pointer;
}

.indicators-table tbody tr.is-abnormal {
  background-color: var(--color-error-bg);
}

.indicators-table tbody tr.is-abnormal:hover {
  background-color: color-mix(in srgb, var(--color-error) 15%, transparent);
}

.indicator-name {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.indicator-value {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.indicator-value .unit {
  font-weight: var(--font-weight-normal);
  color: var(--color-text-secondary);
  margin-left: var(--spacing-1);
}

.indicator-range {
  color: var(--color-text-secondary);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.status-badge.normal {
  background-color: var(--color-success-bg);
  color: var(--color-success-dark);
}

.status-badge.abnormal {
  background-color: var(--color-error-bg);
  color: var(--color-error-dark);
}

.report-summary {
  padding: var(--spacing-4) var(--spacing-5);
  border-top: 1px solid var(--color-border);
}

.summary-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-2) 0;
}

.summary-content {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  margin: 0;
}

.report-disclaimer {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-5);
  background-color: var(--color-bg-tertiary);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  line-height: var(--line-height-normal);
}

.disclaimer-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--color-text-tertiary);
}

@media (max-width: 767px) {
  .report-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-2);
  }

  .indicators-table th,
  .indicators-table td {
    padding: var(--spacing-2) var(--spacing-3);
    font-size: var(--font-size-xs);
  }
}
</style>
