<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  modelValue?: string
  label?: string
  placeholder?: string
  hint?: string
  error?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  maxlength?: number
  rows?: number
  autoResize?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  label: '',
  placeholder: '',
  hint: '',
  error: '',
  disabled: false,
  readonly: false,
  required: false,
  rows: 4,
  autoResize: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}>()

const textareaRef = ref<HTMLTextAreaElement>()
const isFocused = ref(false)

const textareaClasses = computed(() => [
  'textarea-wrapper',
  {
    'textarea-focused': isFocused.value,
    'textarea-error': props.error,
    'textarea-disabled': props.disabled
  }
])

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
  
  if (props.autoResize) {
    target.style.height = 'auto'
    target.style.height = `${target.scrollHeight}px`
  }
}

const handleFocus = (event: FocusEvent) => {
  isFocused.value = true
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  isFocused.value = false
  emit('blur', event)
}

const focus = () => textareaRef.value?.focus()
const blur = () => textareaRef.value?.blur()

defineExpose({ focus, blur })
</script>

<template>
  <div class="textarea-container">
    <label v-if="label" class="textarea-label">
      {{ label }}
      <span v-if="required" class="textarea-required">*</span>
    </label>
    <div :class="textareaClasses">
      <textarea
        ref="textareaRef"
        class="textarea-field"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxlength"
        :rows="rows"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      />
    </div>
    <div v-if="error || hint || maxlength" class="textarea-footer">
      <p v-if="error" class="textarea-message textarea-error-message">
        {{ error }}
      </p>
      <p v-else-if="hint" class="textarea-message textarea-hint">
        {{ hint }}
      </p>
      <span v-if="maxlength" class="textarea-count">
        {{ modelValue.length }} / {{ maxlength }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.textarea-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  width: 100%;
}

.textarea-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.textarea-required {
  color: var(--color-error);
  margin-left: var(--spacing-1);
}

.textarea-wrapper {
  display: flex;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.textarea-wrapper:hover:not(.textarea-disabled) {
  border-color: var(--color-border-dark);
}

.textarea-focused {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.textarea-error {
  border-color: var(--color-error);
}

.textarea-error.textarea-focused {
  box-shadow: 0 0 0 3px var(--color-error-bg);
}

.textarea-disabled {
  background-color: var(--color-bg-tertiary);
  cursor: not-allowed;
}

.textarea-disabled .textarea-field {
  cursor: not-allowed;
}

.textarea-field {
  width: 100%;
  min-height: 100px;
  padding: var(--spacing-3) var(--spacing-4);
  background: transparent;
  border: none;
  outline: none;
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
  resize: vertical;
}

.textarea-field::placeholder {
  color: var(--color-text-tertiary);
}

.textarea-field:disabled {
  color: var(--color-text-tertiary);
}

.textarea-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.textarea-message {
  font-size: var(--font-size-xs);
  margin: 0;
}

.textarea-error-message {
  color: var(--color-error);
}

.textarea-hint {
  color: var(--color-text-tertiary);
}

.textarea-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-left: auto;
}
</style>
