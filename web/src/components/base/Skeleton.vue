<script setup lang="ts">
import { computed } from 'vue'

type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'rounded'

interface Props {
  variant?: SkeletonVariant
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
  rows?: number
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'text',
  animation: 'pulse',
  rows: 1
})

const skeletonClasses = computed(() => [
  'skeleton',
  `skeleton-${props.variant}`,
  `skeleton-${props.animation}`
])

const skeletonStyle = computed(() => {
  const style: Record<string, string> = {}
  
  if (props.width) {
    style.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  }
  if (props.height) {
    style.height = typeof props.height === 'number' ? `${props.height}px` : props.height
  }
  
  return style
})
</script>

<template>
  <div v-if="rows === 1" :class="skeletonClasses" :style="skeletonStyle" aria-hidden="true" />
  <div v-else class="skeleton-group" aria-hidden="true">
    <div
      v-for="i in rows"
      :key="i"
      :class="skeletonClasses"
      :style="{
        ...skeletonStyle,
        width: i === rows && rows > 1 ? '70%' : skeletonStyle.width
      }"
    />
  </div>
</template>

<style scoped>
.skeleton {
  display: block;
  background-color: var(--color-bg-tertiary);
  position: relative;
  overflow: hidden;
}

.skeleton-text {
  height: 1em;
  border-radius: var(--radius-sm);
  transform: scale(1, 0.6);
  margin-top: calc(1em * 0.2);
  margin-bottom: calc(1em * 0.2);
}

.skeleton-circular {
  border-radius: var(--radius-full);
}

.skeleton-rectangular {
  border-radius: 0;
}

.skeleton-rounded {
  border-radius: var(--radius-lg);
}

.skeleton-pulse {
  animation: skeleton-pulse 1.5s ease-in-out 0.5s infinite;
}

.skeleton-wave {
  background: linear-gradient(
    90deg,
    var(--color-bg-tertiary) 25%,
    var(--color-surface-hover) 50%,
    var(--color-bg-tertiary) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-wave 1.5s ease-in-out infinite;
}

.skeleton-none {
  animation: none;
}

.skeleton-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

@keyframes skeleton-pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
}

@keyframes skeleton-wave {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-pulse,
  .skeleton-wave {
    animation: none;
  }
}
</style>
