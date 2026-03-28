<script setup lang="ts">
import { computed } from 'vue'
import IconAlertTriangle from '@/components/icons/IconAlertTriangle.vue'

interface Props {
  name: string
  composition?: string
  indications?: string
  dosage?: string
  precautions?: string
  warnings?: string[]
  expiryDate?: string
  image?: string
}

const props = defineProps<Props>()

defineEmits<{
  click: []
}>()

const hasWarnings = computed(() => 
  props.warnings && props.warnings.length > 0
)
</script>

<template>
  <div class="drug-card" @click="$emit('click')">
    <div class="drug-header">
      <div v-if="image" class="drug-image">
        <img :src="image" :alt="name" />
      </div>
      <div class="drug-title-wrapper">
        <h4 class="drug-name">{{ name }}</h4>
        <p v-if="composition" class="drug-composition">{{ composition }}</p>
      </div>
    </div>

    <div v-if="hasWarnings" class="drug-warnings">
      <IconAlertTriangle class="warning-icon" />
      <div class="warnings-list">
        <span v-for="(warning, index) in warnings" :key="index" class="warning-item">
          {{ warning }}
        </span>
      </div>
    </div>

    <div class="drug-details">
      <div v-if="indications" class="detail-item">
        <span class="detail-label">适应症</span>
        <p class="detail-value">{{ indications }}</p>
      </div>

      <div v-if="dosage" class="detail-item">
        <span class="detail-label">用法用量</span>
        <p class="detail-value">{{ dosage }}</p>
      </div>

      <div v-if="precautions" class="detail-item">
        <span class="detail-label">注意事项</span>
        <p class="detail-value">{{ precautions }}</p>
      </div>

      <div v-if="expiryDate" class="detail-item">
        <span class="detail-label">有效期</span>
        <p class="detail-value">{{ expiryDate }}</p>
      </div>
    </div>

    <div class="drug-disclaimer">
      <IconAlertTriangle class="disclaimer-icon" />
      <span>以上信息仅供参考，用药请遵医嘱或阅读药品说明书</span>
    </div>
  </div>
</template>

<style scoped>
.drug-card {
  background-color: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.drug-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.drug-header {
  display: flex;
  gap: var(--spacing-4);
  padding: var(--spacing-4) var(--spacing-5);
  background-color: var(--color-bg-tertiary);
}

.drug-image {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background-color: var(--color-surface);
  flex-shrink: 0;
}

.drug-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.drug-title-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--spacing-1);
  min-width: 0;
}

.drug-name {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.drug-composition {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.drug-warnings {
  display: flex;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-5);
  background-color: var(--color-warning-bg);
}

.warning-icon {
  width: 18px;
  height: 18px;
  color: var(--color-warning);
  flex-shrink: 0;
  margin-top: 2px;
}

.warnings-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.warning-item {
  font-size: var(--font-size-xs);
  color: var(--color-warning-dark);
  font-weight: var(--font-weight-medium);
  padding: var(--spacing-1) var(--spacing-2);
  background-color: color-mix(in srgb, var(--color-warning) 20%, transparent);
  border-radius: var(--radius-sm);
}

.drug-details {
  padding: var(--spacing-4) var(--spacing-5);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.detail-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  line-height: var(--line-height-relaxed);
  margin: 0;
}

.drug-disclaimer {
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
  .drug-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .drug-image {
    width: 100px;
    height: 100px;
  }
}
</style>
