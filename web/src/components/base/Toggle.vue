<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue?: boolean
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
  size: 'md'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  change: [value: boolean]
}>()

const toggleClasses = computed(() => [
  'toggle',
  `toggle-${props.size}`,
  {
    'toggle-active': props.modelValue,
    'toggle-disabled': props.disabled
  }
])

const toggle = () => {
  if (!props.disabled) {
    const newValue = !props.modelValue
    emit('update:modelValue', newValue)
    emit('change', newValue)
  }
}
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :class="toggleClasses"
    :disabled="disabled"
    @click="toggle"
  >
    <span class="toggle-thumb" />
  </button>
</template>

<style scoped>
.toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  background-color: var(--color-border-dark);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.toggle:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.toggle:hover:not(.toggle-disabled) {
  background-color: var(--color-text-tertiary);
}

.toggle-active {
  background-color: var(--color-primary);
}

.toggle-active:hover:not(.toggle-disabled) {
  background-color: var(--color-primary-dark);
}

.toggle-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-sm {
  width: 32px;
  height: 18px;
}

.toggle-md {
  width: 44px;
  height: 24px;
}

.toggle-lg {
  width: 56px;
  height: 30px;
}

.toggle-thumb {
  position: absolute;
  background-color: var(--color-surface);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-fast);
}

.toggle-sm .toggle-thumb {
  width: 14px;
  height: 14px;
  left: 2px;
}

.toggle-md .toggle-thumb {
  width: 20px;
  height: 20px;
  left: 2px;
}

.toggle-lg .toggle-thumb {
  width: 26px;
  height: 26px;
  left: 2px;
}

.toggle-active .toggle-thumb {
  transform: translateX(100%);
}

.toggle-sm.toggle-active .toggle-thumb {
  transform: translateX(14px);
}

.toggle-md.toggle-active .toggle-thumb {
  transform: translateX(20px);
}

.toggle-lg.toggle-active .toggle-thumb {
  transform: translateX(26px);
}
</style>
