<script setup lang="ts">
import { ref, watch } from 'vue'
import IconCheckCircle from '@/components/icons/IconCheckCircle.vue'
import IconAlertCircle from '@/components/icons/IconAlertCircle.vue'
import IconAlertTriangle from '@/components/icons/IconAlertTriangle.vue'
import IconInfo from '@/components/icons/IconInfo.vue'
import IconClose from '@/components/icons/IconClose.vue'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Props {
  visible?: boolean
  type?: ToastType
  message?: string
  duration?: number
  closable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  type: 'info',
  message: '',
  duration: 3000,
  closable: true
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  close: []
}>()

const show = ref(props.visible)

watch(() => props.visible, (val) => {
  show.value = val
  if (val && props.duration > 0) {
    setTimeout(() => {
      close()
    }, props.duration)
  }
})

const iconMap = {
  success: IconCheckCircle,
  error: IconAlertCircle,
  warning: IconAlertTriangle,
  info: IconInfo
}

const close = () => {
  show.value = false
  emit('update:visible', false)
  emit('close')
}
</script>

<template>
  <Transition name="toast">
    <div v-if="show" :class="['toast', `toast-${type}`]">
      <component :is="iconMap[type]" class="toast-icon" />
      <span class="toast-message">{{ message }}</span>
      <button v-if="closable" class="toast-close" @click="close">
        <IconClose />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  min-width: 280px;
  max-width: 400px;
}

.toast-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-regular);
  color: var(--color-text-primary);
  letter-spacing: var(--letter-spacing-normal);
}

.toast-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.toast-close:hover {
  background-color: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.toast-close :deep(svg) {
  width: 16px;
  height: 16px;
}

.toast-success .toast-icon {
  color: var(--color-success);
}

.toast-error .toast-icon {
  color: var(--color-error);
}

.toast-warning .toast-icon {
  color: var(--color-warning);
}

.toast-info .toast-icon {
  color: var(--color-primary);
}

.toast-enter-active,
.toast-leave-active {
  transition: all var(--transition-normal);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
