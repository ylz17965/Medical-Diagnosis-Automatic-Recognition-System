<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  value: number
  min: number
  max: number
  step?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  step: 1,
  disabled: false
})

const emit = defineEmits<{
  (e: 'input', value: number): void
  (e: 'change', value: number): void
}>()

const percentage = computed(() => {
  if (props.max === props.min) return 0
  return ((props.value - props.min) / (props.max - props.min)) * 100
})

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  emit('input', value)
}

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  emit('change', value)
}
</script>

<template>
  <div class="slice-slider" :class="{ disabled }">
    <input
      type="range"
      class="slider-input"
      :value="value"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      @input="handleInput"
      @change="handleChange"
    />
    <div class="slider-track">
      <div class="slider-fill" :style="{ width: `${percentage}%` }" />
      <div class="slider-thumb-indicator" :style="{ left: `${percentage}%` }" />
    </div>
  </div>
</template>

<style scoped>
.slice-slider {
  position: relative;
  height: 24px;
  display: flex;
  align-items: center;
}

.slice-slider.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.slider-input {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
}

.slider-track {
  position: relative;
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: visible;
}

.slider-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #818cf8);
  border-radius: 2px;
  transition: width 0.1s ease;
}

.slider-thumb-indicator {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: left 0.1s ease;
  pointer-events: none;
}

.slider-input:hover + .slider-track .slider-thumb-indicator {
  transform: translate(-50%, -50%) scale(1.2);
}

.slider-input:active + .slider-track .slider-thumb-indicator {
  transform: translate(-50%, -50%) scale(1.1);
  background: #818cf8;
}
</style>
