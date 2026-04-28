<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'
import IconClose from '@/components/icons/IconClose.vue'

interface Props {
  modelValue: boolean
  title: string
  size?: 'sm' | 'md' | 'lg'
  danger?: boolean
  closable?: boolean
  closeOnOverlay?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  danger: false,
  closable: true,
  closeOnOverlay: true
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    close()
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.modelValue && props.closable) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

watch(() => props.modelValue, (value) => {
  if (value) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="modelValue"
        class="modal-overlay"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`modal-title-${title}`"
        @click.self="handleOverlayClick"
      >
        <Transition name="modal-slide">
          <div
            v-if="modelValue"
            :class="['modal-container', `modal-${size}`]"
          >
            <div class="modal-header">
              <h3
                :id="`modal-title-${title}`"
                :class="['modal-title', { 'modal-title-danger': danger }]"
              >
                {{ title }}
              </h3>
              <button
                v-if="closable"
                class="modal-close"
                type="button"
                aria-label="关闭"
                @click="close"
              >
                <IconClose />
              </button>
            </div>
            
            <div class="modal-body">
              <slot />
            </div>
            
            <div v-if="$slots.footer" class="modal-footer">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-index-modal);
  padding: var(--spacing-4);
}

.modal-container {
  background-color: var(--color-surface);
  border-radius: var(--radius-xl);
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
}

.modal-sm {
  max-width: 360px;
}

.modal-md {
  max-width: 440px;
}

.modal-lg {
  max-width: 600px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-5);
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  letter-spacing: var(--letter-spacing-headline);
  margin: 0;
}

.modal-title-danger {
  color: var(--color-error);
}

.modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.modal-close:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.modal-close :deep(svg) {
  width: 20px;
  height: 20px;
}

.modal-body {
  padding: var(--spacing-5);
}

.modal-footer {
  display: flex;
  gap: var(--spacing-3);
  padding: var(--spacing-4) var(--spacing-5);
  border-top: 1px solid var(--color-border);
}

.modal-footer > * {
  flex: 1;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-slide-enter-active {
  transition: all 0.3s ease-out;
}

.modal-slide-leave-active {
  transition: all 0.2s ease-in;
}

.modal-slide-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(-20px);
}

.modal-slide-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
}
</style>
