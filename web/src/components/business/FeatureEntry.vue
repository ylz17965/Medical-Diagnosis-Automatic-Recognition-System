<script setup lang="ts">
import { computed } from 'vue'
import IconSearch from '@/components/icons/IconSearch.vue'
import IconMessage from '@/components/icons/IconMessage.vue'
import IconFile from '@/components/icons/IconFile.vue'
import IconBox from '@/components/icons/IconBox.vue'
import IconLung from '@/components/icons/IconLung.vue'
import IconHeart from '@/components/icons/IconHeart.vue'

export type FeatureType = 'search' | 'qa' | 'report' | 'drug' | 'lung' | 'heart' | 'lung-ct'

interface Props {
  type: FeatureType
  title?: string
  description?: string
  active?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  active: false
})

defineEmits<{
  click: []
}>()

const featureConfig = {
  search: {
    icon: IconSearch,
    title: '深度搜索',
    description: '搜索权威医学资料',
    color: '#2563EB'
  },
  qa: {
    icon: IconMessage,
    title: '健康问答',
    description: '智能健康咨询',
    color: '#0D9488'
  },
  report: {
    icon: IconFile,
    title: '报告解读',
    description: '解读体检报告',
    color: '#7C3AED'
  },
  drug: {
    icon: IconBox,
    title: '药盒识别',
    description: '识别药品信息',
    color: '#F59E0B'
  },
  lung: {
    icon: IconLung,
    title: '肺癌早筛',
    description: '肺结节风险评估',
    color: '#10B981'
  },
  heart: {
    icon: IconHeart,
    title: '高血压管理',
    description: '血压分析与用药',
    color: '#EF4444'
  },
  'lung-ct': {
    icon: IconLung,
    title: '肺部CT',
    description: 'CT影像可视化',
    color: '#8B5CF6'
  }
}

const config = computed(() => featureConfig[props.type])

const entryClasses = computed(() => [
  'feature-entry',
  { 'is-active': props.active }
])
</script>

<template>
  <button
    :class="entryClasses"
    :style="{ '--feature-color': config.color }"
    :aria-label="`${title || config.title}：${description || config.description}`"
    @click="$emit('click')"
  >
    <div class="feature-icon">
      <component :is="config.icon" />
    </div>
    <div class="feature-info">
      <span class="feature-title">{{ title || config.title }}</span>
      <span class="feature-desc">{{ description || config.description }}</span>
    </div>
  </button>
</template>

<style scoped>
.feature-entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-5);
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 140px;
}

.feature-entry:hover {
  border-color: var(--feature-color);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.feature-entry:active {
  transform: translateY(0);
}

.feature-entry.is-active {
  border-color: var(--feature-color);
  background-color: var(--color-surface);
}

.feature-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background-color: color-mix(in srgb, var(--feature-color) 10%, transparent);
  border-radius: var(--radius-xl);
  color: var(--feature-color);
  transition: all var(--transition-fast);
}

.feature-entry:hover .feature-icon {
  background-color: var(--feature-color);
  color: var(--color-text-inverse);
  transform: scale(1.05);
}

.feature-icon :deep(svg) {
  width: 28px;
  height: 28px;
}

.feature-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-1);
  text-align: center;
}

.feature-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  letter-spacing: var(--letter-spacing-normal);
}

.feature-desc {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-regular);
  color: var(--color-text-secondary);
  letter-spacing: var(--letter-spacing-caption);
}

@media (max-width: 767px) {
  .feature-entry {
    min-width: 100px;
    padding: var(--spacing-4);
  }

  .feature-icon {
    width: 48px;
    height: 48px;
  }

  .feature-icon :deep(svg) {
    width: 24px;
    height: 24px;
  }
}
</style>
