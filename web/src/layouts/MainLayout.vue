<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Sidebar } from '@/components/navigation'
import { HelpModal } from '@/components/business'
import { useUserStore } from '@/stores/user'
import { useConversationStore } from '@/stores/conversation'

const router = useRouter()
const userStore = useUserStore()
const conversationStore = useConversationStore()

const sidebarCollapsed = ref(false)
const isMobile = ref(false)
const showHelpModal = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 1280
  if (isMobile.value) {
    sidebarCollapsed.value = true
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

const handleNewChat = () => {
  conversationStore.createConversation('chat')
  router.push('/')
}

const handleSelectChat = (id: string) => {
  conversationStore.selectConversation(id)
  router.push('/')
}

const handleDeleteChat = (id: string) => {
  conversationStore.deleteConversation(id)
}

const handleSettings = () => {
  router.push('/profile')
}

const handleHelp = () => {
  showHelpModal.value = true
}

const handleLogout = () => {
  userStore.logout()
  conversationStore.clearConversations()
  router.push('/login')
}
</script>

<template>
  <div class="main-layout">
    <Sidebar
      :collapsed="sidebarCollapsed"
      :conversations="conversationStore.conversations"
      :active-id="conversationStore.activeId"
      :user="userStore.user ?? undefined"
      @update:collapsed="sidebarCollapsed = $event"
      @new-chat="handleNewChat"
      @select-chat="handleSelectChat"
      @delete-chat="handleDeleteChat"
      @settings="handleSettings"
      @help="handleHelp"
      @logout="handleLogout"
    />
    <main class="main-content">
      <div class="content-wrapper">
        <slot />
      </div>
    </main>
    <div
      v-if="isMobile && !sidebarCollapsed"
      class="sidebar-overlay"
      @click="sidebarCollapsed = true"
    />
    <HelpModal v-model="showHelpModal" />
  </div>
</template>

<style scoped>
.main-layout {
  display: flex;
  min-height: 100vh;
  background-color: var(--color-bg-primary);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-left: 0;
  transition: margin-left var(--transition-slow);
}

.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: var(--max-content-width);
  width: 100%;
  margin: 0 auto;
  padding: var(--spacing-6);
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: calc(var(--z-index-fixed) - 1);
}

@media (max-width: 1279px) {
  .main-content {
    margin-left: 0;
  }

  .content-wrapper {
    padding: var(--spacing-4);
  }
}
</style>
