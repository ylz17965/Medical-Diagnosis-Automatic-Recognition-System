<script setup lang="ts">
import IconSearch from '@/components/icons/IconSearch.vue'

interface Action {
  label: string
  handler: () => void
}

interface Props {
  title?: string
  description?: string
  icon?: any
  actions?: Action[]
}

withDefaults(defineProps<Props>(), {
  title: '暂无数据',
  description: '',
  icon: IconSearch
})

const emit = defineEmits<{
  action: [action: Action]
}>()

const handleAction = (action: Action) => {
  emit('action', action)
  action.handler()
}
</script>

<template>
  <div class="empty-state">
    <div class="empty-icon">
      <component :is="icon" />
    </div>
    <div class="empty-content">
      <h3 class="empty-title">{{ title }}</h3>
      <p v-if="description" class="empty-description">{{ description }}</p>
      <div v-if="actions && actions.length > 0" class="empty-actions">
        <button
          v-for="action in actions"
          :key="action.label"
          class="action-btn"
          @click="handleAction(action)"
        >
          {{ action.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
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
  transition: all var(--transition-fast);
}

.empty-icon:hover {
  background-color: var(--color-primary-bg);
  transform: scale(1.05);
}

.empty-icon :deep(svg) {
  width: 32px;
  height: 32px;
  color: var(--color-primary);
}

.empty-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-2);
}

.empty-description {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  max-width: 280px;
  line-height: 1.6;
}

.empty-actions {
  display: flex;
  gap: var(--spacing-2);
  margin-top: var(--spacing-4);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-5);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background-color: var(--color-primary-bg);
}

.action-btn:focus-visible {
  outline: 2px solid var(--color-primary);
}

.action-btn :deep(svg) {
  width: 16px;
  height: 16px;
  color: var(--color-primary);
}
</style>
