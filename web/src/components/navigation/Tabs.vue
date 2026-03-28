<script setup lang="ts">
import { computed } from 'vue'

interface Tab {
  key: string
  label: string
  disabled?: boolean
  icon?: any
  badge?: number | string
}

interface Props {
  tabs: Tab[]
  modelValue?: string
  type?: 'line' | 'card'
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'line',
  size: 'md'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const tabClasses = computed(() => [
  'tabs',
  `tabs-${props.type}`,
  `tabs-${props.size}`
])

const selectTab = (tab: Tab) => {
  if (tab.disabled) return
  emit('update:modelValue', tab.key)
  emit('change', tab.key)
}

const getTabClasses = (tab: Tab) => [
  'tab-item',
  {
    'is-active': tab.key === props.modelValue,
    'is-disabled': tab.disabled
  }
]
</script>

<template>
  <div :class="tabClasses">
    <div class="tabs-nav">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="getTabClasses(tab)"
        :disabled="tab.disabled"
        @click="selectTab(tab)"
      >
        <component v-if="tab.icon" :is="tab.icon" class="tab-icon" />
        <span class="tab-label">{{ tab.label }}</span>
        <span v-if="tab.badge !== undefined" class="tab-badge">
          {{ tab.badge }}
        </span>
      </button>
    </div>
    <div class="tabs-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  flex-direction: column;
}

.tabs-nav {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  border-bottom: 1px solid var(--color-border);
}

.tabs-line .tabs-nav {
  border-bottom: 2px solid var(--color-border);
}

.tabs-card .tabs-nav {
  background-color: var(--color-bg-tertiary);
  padding: var(--spacing-2);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  border: none;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
  white-space: nowrap;
}

.tabs-sm .tab-item {
  padding: var(--spacing-2) var(--spacing-3);
  font-size: var(--font-size-sm);
}

.tabs-md .tab-item {
  padding: var(--spacing-3) var(--spacing-4);
  font-size: var(--font-size-base);
}

.tabs-lg .tab-item {
  padding: var(--spacing-4) var(--spacing-5);
  font-size: var(--font-size-lg);
}

.tabs-line .tab-item {
  color: var(--color-text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}

.tabs-line .tab-item:hover:not(.is-disabled) {
  color: var(--color-primary);
}

.tabs-line .tab-item.is-active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.tabs-card .tab-item {
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
}

.tabs-card .tab-item:hover:not(.is-disabled) {
  background-color: var(--color-surface-hover);
}

.tabs-card .tab-item.is-active {
  background-color: var(--color-surface);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.tab-item.is-disabled {
  color: var(--color-text-tertiary);
  cursor: not-allowed;
}

.tab-icon {
  width: 18px;
  height: 18px;
}

.tab-label {
  font-weight: var(--font-weight-medium);
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 var(--spacing-1);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
  border-radius: var(--radius-full);
}

.tabs-content {
  padding: var(--spacing-4) 0;
}
</style>
