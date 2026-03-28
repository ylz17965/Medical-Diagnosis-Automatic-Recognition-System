<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import IconChevronDown from '@/components/icons/IconChevronDown.vue'

interface Option {
  value: string | number
  label: string
  disabled?: boolean
}

interface Props {
  modelValue?: string | number | null
  options: Option[]
  label?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  label: '',
  placeholder: '请选择',
  error: '',
  disabled: false,
  required: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  change: [value: string | number]
}>()

const selectRef = ref<HTMLDivElement>()
const isOpen = ref(false)

const selectedOption = computed(() => 
  props.options.find(opt => opt.value === props.modelValue)
)

const selectClasses = computed(() => [
  'select-wrapper',
  {
    'select-open': isOpen.value,
    'select-error': props.error,
    'select-disabled': props.disabled
  }
])

const handleSelect = (option: Option) => {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  isOpen.value = false
}

const toggleDropdown = () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
  }
}

const handleClickOutside = (event: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="selectRef" class="select-container">
    <label v-if="label" class="select-label">
      {{ label }}
      <span v-if="required" class="select-required">*</span>
    </label>
    <div :class="selectClasses" @click="toggleDropdown">
      <span :class="['select-value', { 'select-placeholder': !selectedOption }]">
        {{ selectedOption?.label || placeholder }}
      </span>
      <IconChevronDown :class="['select-arrow', { 'select-arrow-up': isOpen }]" />
    </div>
    <Transition name="dropdown">
      <div v-if="isOpen" class="select-dropdown">
        <div
          v-for="option in options"
          :key="option.value"
          :class="[
            'select-option',
            {
              'select-option-selected': option.value === modelValue,
              'select-option-disabled': option.disabled
            }
          ]"
          @click.stop="handleSelect(option)"
        >
          {{ option.label }}
        </div>
      </div>
    </Transition>
    <p v-if="error" class="select-message select-error-message">
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
.select-container {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  width: 100%;
}

.select-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.select-required {
  color: var(--color-error);
  margin-left: var(--spacing-1);
}

.select-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--input-height);
  padding: 0 var(--spacing-4);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.select-wrapper:hover:not(.select-disabled) {
  border-color: var(--color-border-dark);
}

.select-open {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.select-error {
  border-color: var(--color-error);
}

.select-disabled {
  background-color: var(--color-bg-tertiary);
  cursor: not-allowed;
}

.select-value {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
}

.select-placeholder {
  color: var(--color-text-tertiary);
}

.select-arrow {
  width: 18px;
  height: 18px;
  color: var(--color-text-secondary);
  transition: transform var(--transition-fast);
}

.select-arrow-up {
  transform: rotate(180deg);
}

.select-dropdown {
  position: absolute;
  top: calc(100% + var(--spacing-2));
  left: 0;
  right: 0;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-index-dropdown);
  max-height: 240px;
  overflow-y: auto;
}

.select-option {
  padding: var(--spacing-3) var(--spacing-4);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.select-option:hover:not(.select-option-disabled) {
  background-color: var(--color-surface-hover);
}

.select-option-selected {
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
}

.select-option-disabled {
  color: var(--color-text-tertiary);
  cursor: not-allowed;
}

.select-message {
  font-size: var(--font-size-xs);
  margin: 0;
}

.select-error-message {
  color: var(--color-error);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all var(--transition-fast);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
