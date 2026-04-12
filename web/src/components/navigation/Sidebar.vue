<script setup lang="ts">
import { computed, ref } from 'vue'
import IconPlus from '@/components/icons/IconPlus.vue'
import IconSettings from '@/components/icons/IconSettings.vue'
import IconHelp from '@/components/icons/IconHelp.vue'
import IconLogout from '@/components/icons/IconLogout.vue'
import IconSidebar from '@/components/icons/IconSidebar.vue'
import IconMessage from '@/components/icons/IconMessage.vue'
import IconClose from '@/components/icons/IconClose.vue'
import IconLung from '@/components/icons/IconLung.vue'

interface Conversation {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
}

interface Props {
  collapsed?: boolean
  conversations?: Conversation[]
  activeId?: string
  user?: {
    avatar?: string
    nickname: string
  }
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
  conversations: () => [],
  activeId: '',
  user: () => ({ nickname: '用户' })
})

const emit = defineEmits<{
  'update:collapsed': [value: boolean]
  newChat: []
  selectChat: [id: string]
  deleteChat: [id: string]
  settings: []
  help: []
  logout: []
}>()

const deletingId = ref<string | null>(null)
const hoverId = ref<string | null>(null)

const sidebarClasses = computed(() => [
  'sidebar',
  { 'sidebar-collapsed': props.collapsed }
])

const toggleCollapse = () => {
  emit('update:collapsed', !props.collapsed)
}

const formatDate = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

const handleDelete = (id: string, event: Event) => {
  event.stopPropagation()
  deletingId.value = id
}

const confirmDelete = (id: string) => {
  emit('deleteChat', id)
  deletingId.value = null
}

const cancelDelete = () => {
  deletingId.value = null
}
</script>

<template>
  <aside 
    :class="sidebarClasses"
    :aria-expanded="!collapsed"
    :aria-label="collapsed ? '侧边栏已收起' : '侧边栏'"
  >
    <div class="sidebar-header">
      <div v-if="!collapsed" class="user-info">
        <div class="user-avatar" role="img" :aria-label="user?.nickname || '用户头像'">
          <img v-if="user?.avatar" :src="user.avatar" :alt="user.nickname" />
          <span v-else class="avatar-placeholder">{{ user?.nickname?.charAt(0) }}</span>
        </div>
        <div class="user-details">
          <span class="user-nickname">{{ user?.nickname }}</span>
          <button class="edit-profile-btn" aria-label="编辑个人资料" @click="$emit('settings')">编辑资料</button>
        </div>
      </div>
      <button 
        class="collapse-btn" 
        :aria-label="collapsed ? '展开侧边栏' : '收起侧边栏'"
        :aria-expanded="!collapsed"
        @click="toggleCollapse"
      >
        <IconSidebar aria-hidden="true" />
      </button>
    </div>

    <div class="sidebar-content" :aria-hidden="collapsed">
      <button class="new-chat-btn" aria-label="新建对话" @click="$emit('newChat')">
        <IconPlus aria-hidden="true" />
        <span v-if="!collapsed">新建对话</span>
      </button>

      <div 
        v-if="!collapsed && conversations.length > 0" 
        class="conversations-list" 
        role="list"
        aria-label="对话列表"
      >
        <TransitionGroup name="conv-list" tag="div">
          <div
            v-for="conv in conversations"
            :key="conv.id"
            :class="['conversation-item', { active: conv.id === activeId, hovering: hoverId === conv.id }]"
            role="listitem"
            :aria-selected="conv.id === activeId"
            tabindex="0"
            @mouseenter="hoverId = conv.id"
            @mouseleave="hoverId = null"
            @click="$emit('selectChat', conv.id)"
            @keydown.enter="$emit('selectChat', conv.id)"
          >
            <IconMessage class="conv-icon" aria-hidden="true" />
            <span class="conv-title">{{ conv.title }}</span>
            
            <div class="conv-actions">
              <Transition name="fade" mode="out-in">
                <div v-if="deletingId === conv.id" class="delete-confirm" @click.stop>
                  <button class="confirm-yes" aria-label="确认删除对话" @click="confirmDelete(conv.id)">删除</button>
                  <button class="confirm-no" aria-label="取消删除" @click="cancelDelete">取消</button>
                </div>
                <span v-else-if="hoverId !== conv.id" class="conv-date" aria-label="更新时间">{{ formatDate(conv.updatedAt) }}</span>
                <button
                  v-else
                  class="delete-btn"
                  :aria-label="`删除对话: ${conv.title}`"
                  @click="handleDelete(conv.id, $event)"
                >
                  <IconClose aria-hidden="true" />
                </button>
              </Transition>
            </div>
          </div>
        </TransitionGroup>
      </div>

      <div v-if="!collapsed && conversations.length === 0" class="empty-state" role="status">
        <p>暂无对话记录</p>
        <p class="empty-hint">点击上方按钮开始新对话</p>
      </div>

      <div class="nav-divider" v-if="!collapsed"></div>

      <div class="nav-menu" v-if="!collapsed">
        <a href="/lung-ct" class="nav-item">
          <IconLung class="nav-icon" />
          <span>肺部CT</span>
        </a>
        <a href="/lung-cancer" class="nav-item">
          <IconMessage class="nav-icon" />
          <span>肺癌早筛</span>
        </a>
        <a href="/hypertension" class="nav-item">
          <IconMessage class="nav-icon" />
          <span>高血压管理</span>
        </a>
        <a href="/dashboard" class="nav-item">
          <IconMessage class="nav-icon" />
          <span>健康仪表盘</span>
        </a>
      </div>
    </div>

    <div class="sidebar-footer" :aria-hidden="collapsed">
      <button 
        class="footer-btn" 
        :aria-label="collapsed ? '设置' : ''"
        @click="$emit('settings')"
      >
        <IconSettings aria-hidden="true" />
        <span v-if="!collapsed">设置</span>
      </button>
      <button 
        class="footer-btn" 
        :aria-label="collapsed ? '帮助' : ''"
        @click="$emit('help')"
      >
        <IconHelp aria-hidden="true" />
        <span v-if="!collapsed">帮助</span>
      </button>
      <button 
        class="footer-btn logout" 
        :aria-label="collapsed ? '退出登录' : ''"
        @click="$emit('logout')"
      >
        <IconLogout aria-hidden="true" />
        <span v-if="!collapsed">退出登录</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width);
  height: 100vh;
  background-color: var(--color-surface);
  border-right: 1px solid var(--color-border);
  transition: width var(--transition-slow);
  overflow: hidden;
}

.sidebar-collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4);
  border-bottom: 1px solid var(--color-border);
  min-height: 72px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  flex: 1;
  min-width: 0;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background-color: var(--color-primary-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.user-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-nickname {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  letter-spacing: var(--letter-spacing-normal);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.edit-profile-btn {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-regular);
  color: var(--color-text-secondary);
  letter-spacing: var(--letter-spacing-caption);
  text-align: left;
  padding: 0;
  transition: color var(--transition-fast);
}

.edit-profile-btn:hover {
  color: var(--color-primary);
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.collapse-btn:hover {
  background-color: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.collapse-btn :deep(svg) {
  width: 20px;
  height: 20px;
}

.sidebar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-3);
  overflow-y: auto;
}

.new-chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  width: 100%;
  height: var(--button-height);
  background: var(--color-primary-gradient);
  color: var(--color-text-inverse);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  letter-spacing: var(--letter-spacing-normal);
  transition: all var(--transition-fast);
  margin-bottom: var(--spacing-3);
  box-shadow: 0 2px 12px rgba(0, 122, 255, 0.25);
}

.new-chat-btn:hover {
  box-shadow: 0 4px 20px rgba(0, 122, 255, 0.35);
  transform: translateY(-1px);
}

.new-chat-btn :deep(svg) {
  width: 20px;
  height: 20px;
}

.conversations-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  position: relative;
}

.conversation-item:hover {
  background-color: var(--color-surface-hover);
}

.conversation-item.active {
  background-color: var(--color-primary-bg);
}

.conv-icon {
  width: 18px;
  height: 18px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.conversation-item.active .conv-icon {
  color: var(--color-primary);
}

.conv-title {
  flex: 1;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-regular);
  color: var(--color-text-primary);
  letter-spacing: var(--letter-spacing-normal);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 60px;
  flex-shrink: 0;
}

.conv-date {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-regular);
  color: var(--color-text-tertiary);
  letter-spacing: var(--letter-spacing-caption);
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.delete-btn:hover {
  background-color: var(--color-error);
  color: var(--color-text-inverse);
  transform: scale(1.1);
}

.delete-btn :deep(svg) {
  width: 16px;
  height: 16px;
}

.nav-divider {
  height: 1px;
  background: var(--color-border);
  margin: var(--spacing-2) 0;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  margin-top: var(--spacing-2);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.nav-item:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.nav-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.delete-confirm {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--spacing-1) var(--spacing-2);
  box-shadow: var(--shadow-md);
}

.confirm-yes,
.confirm-no {
  font-size: var(--font-size-xs);
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--radius-sm);
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-fast);
}

.confirm-yes {
  background-color: var(--color-error);
  color: var(--color-text-inverse);
}

.confirm-yes:hover {
  background-color: var(--color-error-dark);
}

.confirm-no {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
}

.confirm-no:hover {
  background-color: var(--color-surface-hover);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-fast);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.conv-list-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.conv-list-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.conv-list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.conv-list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.conv-list-move {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-8) var(--spacing-4);
  text-align: center;
}

.empty-state p {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-regular);
  color: var(--color-text-secondary);
  letter-spacing: var(--letter-spacing-normal);
  margin: 0;
}

.empty-hint {
  margin-top: var(--spacing-2) !important;
  font-size: var(--font-size-xs) !important;
  font-weight: var(--font-weight-regular) !important;
  color: var(--color-text-tertiary) !important;
  letter-spacing: var(--letter-spacing-caption) !important;
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  padding: var(--spacing-3);
  border-top: 1px solid var(--color-border);
}

.footer-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-regular);
  color: var(--color-text-secondary);
  letter-spacing: var(--letter-spacing-normal);
  transition: all var(--transition-fast);
}

.footer-btn:hover {
  background-color: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.footer-btn.logout:hover {
  color: var(--color-error);
}

.footer-btn :deep(svg) {
  width: 18px;
  height: 18px;
}

.sidebar-collapsed .sidebar-header {
  justify-content: center;
  padding: var(--spacing-3);
}

.sidebar-collapsed .user-info {
  display: none;
}

.sidebar-collapsed .new-chat-btn {
  padding: 0;
}

.sidebar-collapsed .new-chat-btn span {
  display: none;
}

.sidebar-collapsed .conversations-list,
.sidebar-collapsed .empty-state,
.sidebar-collapsed .nav-menu,
.sidebar-collapsed .nav-divider {
  display: none;
}

.sidebar-collapsed .footer-btn {
  justify-content: center;
  padding: var(--spacing-2);
}

.sidebar-collapsed .footer-btn span {
  display: none;
}

@media (max-width: 1279px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    z-index: var(--z-index-fixed);
    transform: translateX(-100%);
    box-shadow: var(--shadow-xl);
  }

  .sidebar:not(.sidebar-collapsed) {
    transform: translateX(0);
  }
}
</style>
