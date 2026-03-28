<script setup lang="ts">
import IconSearch from '@/components/icons/IconSearch.vue'

interface Props {
  title?: string
  description?: string
  icon?: any
}

withDefaults(defineProps<Props>(), {
  title: '暂无数据',
  description: '',
  icon: IconSearch
})
</script>

<template>
  <div class="empty-state">
    <div class="empty-icon">
      <component :is="icon" />
    </div>
    <h3 class="empty-title">{{ title }}</h3>
    <p v-if="description" class="empty-description">{{ description }}</p>
    <slot name="action" />
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-12) var(--spacing-6);
  text-align: center;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  margin-bottom: var(--spacing-4);
}

.empty-icon :deep(svg) {
  width: 40px;
  height: 40px;
  color: var(--color-text-tertiary);
}

.empty-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-2) 0;
}

.empty-description {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-4) 0;
  max-width: 280px;
}
</style>
