<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue?: string | number | null
  value: string | number
  disabled?: boolean
  label?: string
  name?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  disabled: false,
  label: '',
  name: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  change: [value: string | number]
}>()

const isChecked = computed(() => props.modelValue === props.value)

const radioClasses = computed(() => [
  'radio',
  {
    'radio-checked': isChecked.value,
    'radio-disabled': props.disabled
  }
])

const select = () => {
  if (!props.disabled) {
    emit('update:modelValue', props.value)
    emit('change', props.value)
  }
}
</script>

<template>
  <label :class="['radio-container', { 'radio-disabled': disabled }]">
    <span :class="radioClasses">
      <input
        type="radio"
        class="radio-input"
        :name="name"
        :value="value"
        :checked="isChecked"
        :disabled="disabled"
        @change="select"
      />
      <span class="radio-circle">
        <span v-if="isChecked" class="radio-dot" />
      </span>
    </span>
    <span v-if="label" class="radio-label">{{ label }}</span>
  </label>
</template>

<style scoped>
.radio-container {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  cursor: pointer;
  user-select: none;
}

.radio-container.radio-disabled {
  cursor: not-allowed;
}

.radio {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.radio-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.radio-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background-color: var(--color-surface);
  border: 2px solid var(--color-border-dark);
  border-radius: var(--radius-full);
  transition: all var(--transition-fast);
}

.radio-input:focus-visible + .radio-circle {
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.radio-container:hover .radio-circle:not(.radio-disabled .radio-circle) {
  border-color: var(--color-primary);
}

.radio-checked .radio-circle {
  border-color: var(--color-primary);
}

.radio-dot {
  width: 8px;
  height: 8px;
  background-color: var(--color-primary);
  border-radius: var(--radius-full);
}

.radio-disabled .radio-circle {
  background-color: var(--color-bg-tertiary);
  border-color: var(--color-border);
}

.radio-disabled.radio-checked .radio-circle {
  border-color: var(--color-border-dark);
}

.radio-disabled.radio-checked .radio-dot {
  background-color: var(--color-border-dark);
}

.radio-label {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
}

.radio-disabled .radio-label {
  color: var(--color-text-tertiary);
}
</style>
