<script setup lang="ts">
import { computed, ref } from 'vue'
import IconEye from '@/components/icons/IconEye.vue'
import IconEyeOff from '@/components/icons/IconEyeOff.vue'

type InputSize = 'sm' | 'md' | 'lg'

interface Props {
  modelValue?: string
  type?: 'text' | 'password' | 'email' | 'number' | 'search' | 'tel'
  size?: InputSize
  label?: string
  placeholder?: string
  hint?: string
  error?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  maxlength?: number
  autocomplete?: string
  showPasswordToggle?: boolean
  showCharCount?: boolean
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  size: 'md',
  label: '',
  placeholder: '',
  hint: '',
  error: '',
  disabled: false,
  readonly: false,
  required: false,
  autocomplete: 'off',
  showPasswordToggle: true,
  showCharCount: false,
  id: undefined
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  input: [event: Event]
}>()

const inputRef = ref<HTMLInputElement>()
const isFocused = ref(false)
const showPassword = ref(false)
const inputId = props.id || `input-${Math.random().toString(36).slice(2, 9)}`

const inputClasses = computed(() => [
  'input-wrapper',
  `input-${props.size}`,
  {
    'input-focused': isFocused.value,
    'input-error': props.error,
    'input-disabled': props.disabled
  }
])

const actualType = computed(() => {
  if (props.type === 'password' && showPassword.value) {
    return 'text'
  }
  return props.type
})

const charCount = computed(() => props.modelValue.length)

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
  emit('input', event)
}

const handleFocus = (event: FocusEvent) => {
  isFocused.value = true
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  isFocused.value = false
  emit('blur', event)
}

const togglePassword = () => {
  showPassword.value = !showPassword.value
}

const focus = () => inputRef.value?.focus()
const blur = () => inputRef.value?.blur()

defineExpose({ focus, blur })
</script>

<template>
  <div class="input-container">
    <label v-if="label" :for="inputId" class="input-label">
      {{ label }}
      <span v-if="required" class="input-required" aria-hidden="true">*</span>
    </label>
    <div :class="inputClasses">
      <span v-if="$slots.prefix" class="input-prefix" aria-hidden="true">
        <slot name="prefix" />
      </span>
      <input
        :id="inputId"
        ref="inputRef"
        class="input-field"
        :type="actualType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxlength"
        :autocomplete="autocomplete"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined"
        :aria-required="required"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <button
        v-if="type === 'password' && showPasswordToggle"
        type="button"
        class="password-toggle"
        :aria-label="showPassword ? '隐藏密码' : '显示密码'"
        tabindex="-1"
        @click="togglePassword"
      >
        <IconEyeOff v-if="showPassword" />
        <IconEye v-else />
      </button>
      <span v-if="$slots.suffix" class="input-suffix" aria-hidden="true">
        <slot name="suffix" />
      </span>
    </div>
    <div class="input-footer">
      <p
        v-if="error"
        :id="`${inputId}-error`"
        class="input-message input-error-message"
        role="alert"
      >
        {{ error }}
      </p>
      <p
        v-else-if="hint"
        :id="`${inputId}-hint`"
        class="input-message input-hint"
      >
        {{ hint }}
      </p>
      <span v-else></span>
      <span v-if="showCharCount && maxlength" class="char-count">
        {{ charCount }}/{{ maxlength }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.input-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  width: 100%;
}

.input-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.input-required {
  color: var(--color-error);
  margin-left: var(--spacing-1);
}

.input-wrapper {
  display: flex;
  align-items: center;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.input-wrapper:hover:not(.input-disabled) {
  border-color: var(--color-border-dark);
}

.input-focused {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.input-error {
  border-color: var(--color-error);
}

.input-error.input-focused {
  box-shadow: 0 0 0 3px var(--color-error-bg);
}

.input-disabled {
  background-color: var(--color-bg-tertiary);
  cursor: not-allowed;
}

.input-disabled .input-field {
  cursor: not-allowed;
}

.input-sm {
  height: 32px;
  padding: 0 var(--spacing-3);
}

.input-md {
  height: var(--input-height);
  padding: 0 var(--spacing-4);
}

.input-lg {
  height: 52px;
  padding: 0 var(--spacing-5);
}

.input-field {
  flex: 1;
  width: 100%;
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
}

.input-field::placeholder {
  color: var(--color-text-tertiary);
}

.input-field:disabled {
  color: var(--color-text-tertiary);
}

.input-prefix,
.input-suffix {
  display: flex;
  align-items: center;
  color: var(--color-text-secondary);
}

.input-prefix {
  margin-right: var(--spacing-2);
}

.input-suffix {
  margin-left: var(--spacing-2);
}

.password-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-left: var(--spacing-1);
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.password-toggle:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.password-toggle :deep(svg) {
  width: 18px;
  height: 18px;
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  min-height: 16px;
}

.input-message {
  font-size: var(--font-size-xs);
  margin: 0;
}

.input-error-message {
  color: var(--color-error);
}

.input-hint {
  color: var(--color-text-tertiary);
}

.char-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  margin-left: var(--spacing-2);
}
</style>
