<script setup lang="ts">
import { computed } from 'vue'
import IconCheck from '@/components/icons/IconCheck.vue'

interface Props {
  modelValue?: boolean
  indeterminate?: boolean
  disabled?: boolean
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  indeterminate: false,
  disabled: false,
  label: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  change: [value: boolean]
}>()

const checkboxClasses = computed(() => [
  'checkbox',
  {
    'checkbox-checked': props.modelValue,
    'checkbox-indeterminate': props.indeterminate,
    'checkbox-disabled': props.disabled
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
  <label :class="['checkbox-container', { 'checkbox-disabled': disabled }]">
    <span :class="checkboxClasses">
      <input
        type="checkbox"
        class="checkbox-input"
        :checked="modelValue"
        :disabled="disabled"
        @change="toggle"
      />
      <span class="checkbox-box">
        <IconCheck v-if="modelValue && !indeterminate" class="checkbox-icon" />
        <span v-else-if="indeterminate" class="checkbox-indeterminate-icon" />
      </span>
    </span>
    <span v-if="label" class="checkbox-label">{{ label }}</span>
  </label>
</template>

<style scoped>
.checkbox-container {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  cursor: pointer;
  user-select: none;
}

.checkbox-container.checkbox-disabled {
  cursor: not-allowed;
}

.checkbox {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.checkbox-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.checkbox-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background-color: var(--color-surface);
  border: 2px solid var(--color-border-dark);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.checkbox-input:focus-visible + .checkbox-box {
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.checkbox-container:hover .checkbox-box:not(.checkbox-disabled .checkbox-box) {
  border-color: var(--color-primary);
}

.checkbox-checked .checkbox-box {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.checkbox-indeterminate .checkbox-box {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.checkbox-icon {
  width: 14px;
  height: 14px;
  color: var(--color-text-inverse);
}

.checkbox-indeterminate-icon {
  width: 10px;
  height: 2px;
  background-color: var(--color-text-inverse);
  border-radius: 1px;
}

.checkbox-disabled .checkbox-box {
  background-color: var(--color-bg-tertiary);
  border-color: var(--color-border);
}

.checkbox-disabled.checkbox-checked .checkbox-box {
  background-color: var(--color-border-dark);
  border-color: var(--color-border-dark);
}

.checkbox-label {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
}

.checkbox-disabled .checkbox-label {
  color: var(--color-text-tertiary);
}
</style>
