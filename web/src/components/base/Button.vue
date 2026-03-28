<script setup lang="ts">
import { computed } from 'vue'
import IconLoading from '@/components/icons/IconLoading.vue'

type ButtonVariant = 'primary' | 'secondary' | 'text' | 'icon' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

interface Props {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  block?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
  block: false,
  type: 'button'
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonClasses = computed(() => [
  'btn',
  `btn-${props.variant}`,
  `btn-${props.size}`,
  {
    'btn-loading': props.loading,
    'btn-block': props.block,
    'btn-disabled': props.disabled
  }
])

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<template>
  <button
    :class="buttonClasses"
    :type="type"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="btn-icon-loading">
      <IconLoading />
    </span>
    <slot v-else name="icon" />
    <span v-if="$slots.default" class="btn-content">
      <slot />
    </span>
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
  white-space: nowrap;
  user-select: none;
  outline: none;
}

.btn:focus-visible {
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.btn-sm {
  height: 32px;
  padding: 0 var(--spacing-3);
  font-size: var(--font-size-sm);
}

.btn-md {
  height: var(--button-height);
  padding: 0 var(--spacing-5);
  font-size: var(--font-size-base);
}

.btn-lg {
  height: 52px;
  padding: 0 var(--spacing-6);
  font-size: var(--font-size-lg);
}

.btn-primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.btn-primary:hover:not(.btn-disabled) {
  background-color: var(--color-primary-dark);
  box-shadow: var(--shadow-md);
}

.btn-primary:active:not(.btn-disabled) {
  background-color: var(--color-primary-dark);
  transform: scale(0.98);
}

.btn-secondary {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover:not(.btn-disabled) {
  background-color: var(--color-surface-hover);
  border-color: var(--color-border-dark);
}

.btn-secondary:active:not(.btn-disabled) {
  background-color: var(--color-surface-active);
}

.btn-text {
  background-color: transparent;
  color: var(--color-primary);
  padding: 0 var(--spacing-2);
}

.btn-text:hover:not(.btn-disabled) {
  background-color: var(--color-primary-bg);
}

.btn-text:active:not(.btn-disabled) {
  background-color: var(--color-primary-bg);
}

.btn-icon {
  background-color: transparent;
  color: var(--color-text-secondary);
  padding: var(--spacing-2);
  border-radius: var(--radius-md);
}

.btn-icon:hover:not(.btn-disabled) {
  background-color: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.btn-outline {
  background-color: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
}

.btn-outline:hover:not(.btn-disabled) {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.btn-outline:active:not(.btn-disabled) {
  background-color: var(--color-primary-dark);
}

.btn-icon:active:not(.btn-disabled) {
  background-color: var(--color-surface-active);
}

.btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-loading {
  cursor: wait;
}

.btn-block {
  width: 100%;
}

.btn-icon-loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon-loading :deep(svg) {
  width: 18px;
  height: 18px;
  animation: spin 1s linear infinite;
}

.btn-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}
</style>
