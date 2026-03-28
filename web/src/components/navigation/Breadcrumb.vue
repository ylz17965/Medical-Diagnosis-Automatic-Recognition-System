<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

interface BreadcrumbItem {
  label: string
  to?: string
  icon?: any
}

interface Props {
  items: BreadcrumbItem[]
  separator?: string
}

const props = withDefaults(defineProps<Props>(), {
  separator: '/'
})

const lastIndex = computed(() => props.items.length - 1)
</script>

<template>
  <nav class="breadcrumb" aria-label="面包屑导航">
    <ol class="breadcrumb-list">
      <li
        v-for="(item, index) in items"
        :key="index"
        class="breadcrumb-item"
      >
        <component
          :is="item.to ? RouterLink : 'span'"
          :to="item.to"
          :class="['breadcrumb-link', { 'is-current': index === lastIndex }]"
        >
          <component v-if="item.icon" :is="item.icon" class="breadcrumb-icon" />
          {{ item.label }}
        </component>
        <span v-if="index < lastIndex" class="breadcrumb-separator">
          {{ separator }}
        </span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumb {
  display: flex;
  align-items: center;
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-1);
  margin: 0;
  padding: 0;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
}

.breadcrumb-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.breadcrumb-link:hover:not(.is-current) {
  color: var(--color-primary);
}

.breadcrumb-link.is-current {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.breadcrumb-icon {
  width: 16px;
  height: 16px;
}

.breadcrumb-separator {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  user-select: none;
}
</style>
