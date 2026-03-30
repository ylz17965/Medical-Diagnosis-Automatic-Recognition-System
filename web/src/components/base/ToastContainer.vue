<script setup lang="ts">
import IconCheckCircle from '@/components/icons/IconCheckCircle.vue'
import IconAlertCircle from '@/components/icons/IconAlertCircle.vue'
import IconAlertTriangle from '@/components/icons/IconAlertTriangle.vue'
import IconInfo from '@/components/icons/IconInfo.vue'
import IconClose from '@/components/icons/IconClose.vue'
import { useToast } from '@/composables/useToast'

const { toasts, remove } = useToast()

const iconMap = {
  success: IconCheckCircle,
  error: IconAlertCircle,
  warning: IconAlertTriangle,
  info: IconInfo
}

const colorMap = {
  success: 'var(--color-success)',
  error: 'var(--color-error)',
  warning: 'var(--color-warning)',
  info: 'var(--color-secondary)'
}
</script>

<template>
  <div class="toast-container" role="region" aria-label="通知" aria-live="polite">
    <TransitionGroup name="toast-list">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast', `toast-${toast.type}`]"
        :style="{ '--toast-color': colorMap[toast.type] }"
        role="alert"
      >
        <div class="toast-icon">
          <component :is="iconMap[toast.type]" aria-hidden="true" />
        </div>
        <div class="toast-content">
          <p class="toast-title">{{ toast.title }}</p>
          <p v-if="toast.message" class="toast-message">{{ toast.message }}</p>
        </div>
        <button
          v-if="toast.dismissible"
          class="toast-close"
          :aria-label="`关闭通知: ${toast.title}`"
          @click="remove(toast.id)"
        >
          <IconClose aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: var(--spacing-4);
  right: var(--spacing-4);
  z-index: var(--z-index-toast);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  max-width: 400px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  border-left: 4px solid var(--toast-color);
  pointer-events: auto;
}

.toast-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--toast-color);
}

.toast-icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.4;
}

.toast-message {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: var(--spacing-1) 0 0 0;
  line-height: 1.5;
}

.toast-close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  margin: calc(var(--spacing-1) * -1) calc(var(--spacing-1) * -1) 0 0;
}

.toast-close:hover {
  background-color: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.toast-close :deep(svg) {
  width: 16px;
  height: 16px;
}

.toast-list-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-list-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-list-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-list-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-list-move {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (max-width: 767px) {
  .toast-container {
    left: var(--spacing-4);
    right: var(--spacing-4);
    max-width: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast-list-enter-active,
  .toast-list-leave-active {
    transition: none;
  }
}
</style>
