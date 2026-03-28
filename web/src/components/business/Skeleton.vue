<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Props {
  loading?: boolean
  animated?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: true,
  animated: true
})

const show = ref(false)

onMounted(() => {
  if (props.animated) {
    setTimeout(() => {
      show.value = true
    }, 50)
  } else {
    show.value = true
  }
})
</script>

<template>
  <div v-if="loading" class="skeleton-container">
    <div class="skeleton-wrapper" :class="{ 'skeleton-visible': show }">
      <div class="skeleton skeleton-avatar"></div>
      <div class="skeleton-content">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text short"></div>
      </div>
    </div>
  </div>
  <slot v-else />
</template>

<style scoped>
.skeleton-container {
  padding: var(--spacing-4);
}

.skeleton-wrapper {
  display: flex;
  gap: var(--spacing-3);
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.3s ease-out;
}

.skeleton-visible {
  opacity: 1;
  transform: translateY(0);
}

.skeleton-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-bg-tertiary) 25%,
    var(--color-surface-hover) 50%,
    var(--color-bg-tertiary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}

.skeleton-title {
  width: 40%;
  height: 16px;
}

.skeleton-text {
  width: 100%;
  height: 14px;
}

.skeleton-text.short {
  width: 60%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
