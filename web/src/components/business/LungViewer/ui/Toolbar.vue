<script setup lang="ts">
import { computed } from 'vue'

export type ViewMode = 'mpr' | '3d' | 'compare'
export type ToolMode = 'select' | 'distance' | 'angle' | 'ctvalue'

interface Props {
  activeView: ViewMode
  activeTool: ToolMode
  showBronchi: boolean
  showLobes: boolean
  showNodules: boolean
  layout: 'single' | 'dual' | 'quad'
}

withDefaults(defineProps<Props>(), {
  activeView: 'mpr',
  activeTool: 'select',
  showBronchi: true,
  showLobes: true,
  showNodules: true,
  layout: 'quad'
})

const emit = defineEmits<{
  (e: 'viewChange', view: ViewMode): void
  (e: 'toolChange', tool: ToolMode): void
  (e: 'toggleBronchi'): void
  (e: 'toggleLobes'): void
  (e: 'toggleNodules'): void
  (e: 'layoutChange', layout: 'single' | 'dual' | 'quad'): void
  (e: 'reset'): void
}>()

const viewButtons = computed(() => [
  { id: 'mpr' as ViewMode, label: 'MPR', icon: 'grid' },
  { id: '3d' as ViewMode, label: '3D', icon: 'cube' },
  { id: 'compare' as ViewMode, label: '对比', icon: 'compare' }
])

const toolButtons = computed(() => [
  { id: 'pan' as ToolMode, label: '平移', icon: 'move' },
  { id: 'zoom' as ToolMode, label: '缩放', icon: 'zoom' },
  { id: 'measure' as ToolMode, label: '测量', icon: 'ruler' },
  { id: 'annotate' as ToolMode, label: '标注', icon: 'marker' }
])

const layoutButtons = computed(() => [
  { id: 'single' as const, label: '单视图' },
  { id: 'dual' as const, label: '双视图' },
  { id: 'quad' as const, label: '四视图' }
])
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-section">
      <span class="section-label">视图</span>
      <div class="button-group">
        <button
          v-for="btn in viewButtons"
          :key="btn.id"
          class="toolbar-btn"
          :class="{ active: activeView === btn.id }"
          @click="emit('viewChange', btn.id)"
        >
          <svg v-if="btn.icon === 'grid'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="12" y1="3" x2="12" y2="21"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
          </svg>
          <svg v-else-if="btn.icon === 'cube'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          <svg v-else-if="btn.icon === 'compare'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="12" y1="3" x2="12" y2="21"/>
          </svg>
          <span>{{ btn.label }}</span>
        </button>
      </div>
    </div>

    <div class="toolbar-divider" />

    <div class="toolbar-section">
      <span class="section-label">工具</span>
      <div class="button-group">
        <button
          v-for="btn in toolButtons"
          :key="btn.id"
          class="toolbar-btn"
          :class="{ active: activeTool === btn.id }"
          @click="emit('toolChange', btn.id)"
        >
          <svg v-if="btn.icon === 'move'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <line x1="12" y1="2" x2="12" y2="22"/>
          </svg>
          <svg v-else-if="btn.icon === 'zoom'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="11" y1="8" x2="11" y2="14"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
          <svg v-else-if="btn.icon === 'ruler'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
            <path d="M22 12A10 10 0 0 0 12 2v10z"/>
          </svg>
          <svg v-else-if="btn.icon === 'marker'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span>{{ btn.label }}</span>
        </button>
      </div>
    </div>

    <div class="toolbar-divider" />

    <div class="toolbar-section">
      <span class="section-label">显示</span>
      <div class="toggle-group">
        <button
          class="toggle-btn"
          :class="{ active: showLobes }"
          @click="emit('toggleLobes')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
            <path d="M12 8v8M8 12h8"/>
          </svg>
          肺叶
        </button>
        <button
          class="toggle-btn"
          :class="{ active: showBronchi }"
          @click="emit('toggleBronchi')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          支气管
        </button>
        <button
          class="toggle-btn"
          :class="{ active: showNodules }"
          @click="emit('toggleNodules')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="4"/>
          </svg>
          结节
        </button>
      </div>
    </div>

    <div class="toolbar-divider" />

    <div class="toolbar-section">
      <span class="section-label">布局</span>
      <div class="button-group">
        <button
          v-for="btn in layoutButtons"
          :key="btn.id"
          class="toolbar-btn small"
          :class="{ active: layout === btn.id }"
          @click="emit('layoutChange', btn.id)"
        >
          {{ btn.label }}
        </button>
      </div>
    </div>

    <div class="toolbar-spacer" />

    <div class="toolbar-section">
      <button class="reset-btn" @click="emit('reset')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
        重置
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: rgba(30, 41, 59, 0.95);
  border-bottom: 1px solid rgba(99, 102, 241, 0.2);
  flex-wrap: wrap;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-label {
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
  text-transform: uppercase;
  white-space: nowrap;
}

.button-group {
  display: flex;
  gap: 4px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 6px;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: rgba(99, 102, 241, 0.1);
  color: #e2e8f0;
}

.toolbar-btn.active {
  background: rgba(99, 102, 241, 0.2);
  border-color: #818cf8;
  color: #818cf8;
}

.toolbar-btn.small {
  padding: 4px 8px;
  font-size: 11px;
}

.toggle-group {
  display: flex;
  gap: 4px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 16px;
  color: #94a3b8;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: rgba(99, 102, 241, 0.1);
}

.toggle-btn.active {
  background: rgba(99, 102, 241, 0.2);
  border-color: #818cf8;
  color: #818cf8;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: rgba(99, 102, 241, 0.2);
}

.toolbar-spacer {
  flex: 1;
}

.reset-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 6px;
  color: #f87171;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
}
</style>
