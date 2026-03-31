<script setup lang="ts">
import { computed } from 'vue'
import type { ConversationTurn } from '@/composables/useConversationTurns'

interface Props {
  turns: ConversationTurn[]
  currentTurnId?: string
  visible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  turns: () => [],
  visible: true
})

const emit = defineEmits<{
  anchorClick: [turn: ConversationTurn, isLatest: boolean]
}>()

const hasTurns = computed(() => props.turns.length > 0)

const handleClick = (turn: ConversationTurn, isLatest: boolean) => {
  emit('anchorClick', turn, isLatest)
}
</script>

<template>
  <Transition name="sidebar-fade">
    <div v-if="visible && hasTurns" class="anchor-sidebar" role="navigation" aria-label="对话导航">
      <div class="anchor-list">
        <button
          v-for="(turn, index) in turns"
          :key="turn.id"
          :class="['anchor-btn', { 'is-latest': index === turns.length - 1 }]"
          :aria-label="`对话 ${index + 1}: ${turn.userQuestionPreview}`"
          @click="handleClick(turn, index === turns.length - 1)"
        >
          <span class="anchor-indicator"></span>
          <span class="anchor-tooltip">{{ turn.userQuestionPreview }}</span>
        </button>
      </div>
      
      <button
        v-if="turns.length > 0"
        class="scroll-to-bottom-btn"
        aria-label="滚动到最新"
        @click="handleClick(turns[turns.length - 1], true)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 5v14M19 12l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="scroll-tooltip">滚动到最新</span>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.anchor-sidebar {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 100;
  padding: var(--spacing-3);
  background-color: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.sidebar-fade-enter-active,
.sidebar-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
}

.sidebar-fade-enter-from,
.sidebar-fade-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(20px);
}

.anchor-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.anchor-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 20px;
  background: linear-gradient(135deg, var(--color-bg-tertiary) 0%, var(--color-surface-active) 100%);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-normal);
  border: none;
  padding: 0;
  overflow: visible;
}

.anchor-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--color-fill-primary);
  opacity: 0;
  transition: opacity var(--transition-fast);
  border-radius: inherit;
}

.anchor-btn:hover {
  transform: scale(1.15);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2);
}

.anchor-btn:hover::before {
  opacity: 1;
}

.anchor-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.anchor-btn.is-latest {
  background: var(--color-primary-gradient);
  box-shadow: 0 2px 16px rgba(0, 122, 255, 0.35);
}

.anchor-btn.is-latest:hover {
  box-shadow: 0 6px 20px rgba(0, 122, 255, 0.45);
}

.anchor-btn.is-latest::before {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.1) 100%);
}

.anchor-indicator {
  width: 100%;
  height: 100%;
  border-radius: inherit;
}

.anchor-tooltip {
  position: absolute;
  right: calc(100% + 14px);
  top: 50%;
  transform: translateY(-50%) translateX(8px);
  background-color: var(--color-surface-elevated);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  letter-spacing: var(--letter-spacing-normal);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border);
}

.anchor-tooltip::after {
  content: '';
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  border: 6px solid transparent;
  border-left-color: var(--color-border);
}

.anchor-tooltip::before {
  content: '';
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  border: 5px solid transparent;
  border-left-color: var(--color-surface-elevated);
  z-index: 1;
}

.anchor-btn:hover .anchor-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateY(-50%) translateX(0);
}

.scroll-to-bottom-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-top: var(--spacing-2);
  padding-top: var(--spacing-2);
  border-top: 1px solid var(--color-separator);
  background: var(--color-primary-gradient);
  color: var(--color-primary-text);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-normal);
  box-shadow: 0 2px 16px rgba(0, 122, 255, 0.35);
  overflow: visible;
}

.scroll-to-bottom-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 24px rgba(0, 122, 255, 0.45);
}

.scroll-to-bottom-btn:active {
  transform: scale(0.95);
}

.scroll-to-bottom-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.scroll-to-bottom-btn svg {
  width: 20px;
  height: 20px;
}

.scroll-tooltip {
  position: absolute;
  right: calc(100% + 14px);
  top: 50%;
  transform: translateY(-50%) translateX(8px);
  background-color: var(--color-surface-elevated);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  letter-spacing: var(--letter-spacing-normal);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border);
}

.scroll-tooltip::after {
  content: '';
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  border: 6px solid transparent;
  border-left-color: var(--color-border);
}

.scroll-tooltip::before {
  content: '';
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  border: 5px solid transparent;
  border-left-color: var(--color-surface-elevated);
  z-index: 1;
}

.scroll-to-bottom-btn:hover .scroll-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateY(-50%) translateX(0);
}

@media (max-width: 767px) {
  .anchor-sidebar {
    right: 12px;
    padding: var(--spacing-2);
    border-radius: var(--radius-lg);
  }

  .anchor-btn {
    width: 32px;
    height: 16px;
  }

  .anchor-btn:hover {
    width: 36px;
    height: 18px;
  }

  .scroll-to-bottom-btn {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
  }

  .scroll-to-bottom-btn svg {
    width: 18px;
    height: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar-fade-enter-active,
  .sidebar-fade-leave-active {
    transition: none;
  }

  .anchor-btn,
  .scroll-to-bottom-btn,
  .anchor-tooltip,
  .scroll-tooltip {
    transition: none;
  }
}
</style>
