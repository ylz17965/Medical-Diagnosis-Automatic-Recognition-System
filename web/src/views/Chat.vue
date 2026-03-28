<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from 'vue'
import { MainLayout } from '@/layouts'
import { MessageBubble, FeatureEntry } from '@/components/business'
import type { FeatureType } from '@/components/business'
import IconSend from '@/components/icons/IconSend.vue'
import IconUpload from '@/components/icons/IconUpload.vue'
import IconCamera from '@/components/icons/IconCamera.vue'
import IconMic from '@/components/icons/IconMic.vue'
import { useChat } from '@/composables'

const {
  inputMessage,
  currentMode,
  isLoading,
  hasMessages,
  isEmpty,
  charCount,
  maxChars,
  isNearLimit,
  isOverLimit,
  setMode,
  sendMessage,
  simulateResponse,
  handleFileUpload,
  userStore,
  conversationStore
} = useChat()

const messagesContainer = ref<HTMLDivElement>()
const fileInput = ref<HTMLInputElement>()
const textareaRef = ref<HTMLTextAreaElement>()

const handleFeatureClick = (type: FeatureType) => {
  setMode(type)
  nextTick(() => scrollToBottom())
}

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  
  await handleFileUpload(file)
  nextTick(() => scrollToBottom())
  target.value = ''
}

const handleSend = async () => {
  const result = await sendMessage()
  if (!result) return
  
  resetTextareaHeight()
  await nextTick()
  scrollToBottom()
  
  await simulateResponse(result.message, result.mode)
  nextTick(() => scrollToBottom())
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTo({
      top: messagesContainer.value.scrollHeight,
      behavior: 'smooth'
    })
  }
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSend()
  }
}

const autoResize = () => {
  const textarea = textareaRef.value
  if (!textarea) return
  
  textarea.style.height = 'auto'
  const newHeight = Math.min(textarea.scrollHeight, 140)
  textarea.style.height = newHeight + 'px'
}

const resetTextareaHeight = () => {
  const textarea = textareaRef.value
  if (!textarea) return
  textarea.style.height = 'auto'
}

watch(inputMessage, () => {
  nextTick(autoResize)
})

onMounted(() => {
  conversationStore.loadFromStorage()
  userStore.initFromStorage()
})
</script>

<template>
  <MainLayout>
    <div class="chat-page">
      <Transition name="fade-scale" mode="out-in">
        <div v-if="!hasMessages" key="welcome" class="welcome-section">
          <div class="welcome-header">
            <h1 class="welcome-title">您好，{{ userStore.user?.nickname || '用户' }}</h1>
            <p class="welcome-subtitle">我是您的AI健康助手，有什么可以帮您的吗？</p>
          </div>
          
          <div class="feature-grid">
            <FeatureEntry type="search" @click="handleFeatureClick('search')" />
            <FeatureEntry type="qa" @click="handleFeatureClick('qa')" />
            <FeatureEntry type="report" @click="handleFeatureClick('report')" />
            <FeatureEntry type="drug" @click="handleFeatureClick('drug')" />
          </div>
          
          <div class="quick-questions">
            <p class="quick-title">您可以这样问我：</p>
            <div class="question-list">
              <button class="question-item" @click="inputMessage = '头痛应该怎么办？'">
                头痛应该怎么办？
              </button>
              <button class="question-item" @click="inputMessage = '如何预防感冒？'">
                如何预防感冒？
              </button>
              <button class="question-item" @click="inputMessage = '体检报告怎么看？'">
                体检报告怎么看？
              </button>
            </div>
          </div>
        </div>
        
        <div v-else key="chat" class="chat-section">
          <div ref="messagesContainer" class="messages-container">
            <TransitionGroup name="message-list">
              <MessageBubble
                v-for="message in conversationStore.activeConversation?.messages"
                :key="message.id"
                :type="message.role === 'user' ? 'user' : 'ai'"
                :content="message.content"
                :loading="message.loading"
                :timestamp="message.timestamp"
                :avatar="userStore.user?.avatar"
                :sources="message.sources"
              />
            </TransitionGroup>
          </div>
          
          <div v-if="currentMode === 'report' || currentMode === 'drug'" class="upload-area">
            <input
              ref="fileInput"
              type="file"
              accept="image/*,.pdf"
              hidden
              @change="handleFileChange"
            />
            <button
              class="upload-box"
              type="button"
              :aria-label="currentMode === 'report' ? '上传体检报告' : '上传药盒照片'"
              @click="fileInput?.click()"
            >
              <IconUpload class="upload-icon" aria-hidden="true" />
              <p class="upload-text">
                {{ currentMode === 'report' ? '点击或拖拽上传体检报告' : '点击或拖拽上传药盒照片' }}
              </p>
              <p class="upload-hint">支持 PDF、JPG、PNG 格式</p>
            </button>
          </div>
        </div>
      </Transition>
      
      <div class="input-section">
        <div class="input-container">
          <div class="input-wrapper">
            <div class="textarea-wrapper">
              <textarea
                ref="textareaRef"
                v-model="inputMessage"
                class="input-textarea"
                :class="{ 'input-error': isOverLimit }"
                placeholder="输入您的健康问题..."
                :maxlength="maxChars"
                rows="1"
                :aria-label="hasMessages ? '输入消息' : '输入健康问题'"
                aria-describedby="input-hint"
                @keydown="handleKeyDown"
              />
            </div>
            
            <div class="input-actions">
              <button
                type="button"
                class="action-btn"
                title="上传图片"
                aria-label="上传图片"
                @click="fileInput?.click()"
              >
                <IconCamera aria-hidden="true" />
              </button>
              
              <button
                type="button"
                class="action-btn"
                title="语音输入"
                aria-label="语音输入"
              >
                <IconMic aria-hidden="true" />
              </button>
              
              <button
                type="button"
                class="send-btn"
                :disabled="isEmpty || isLoading || isOverLimit"
                :aria-busy="isLoading"
                aria-label="发送消息"
                @click="handleSend"
              >
                <Transition name="btn-icon" mode="out-in">
                  <svg v-if="isLoading" key="loading" class="loading-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20">
                      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                    </circle>
                  </svg>
                  <IconSend v-else key="send" aria-hidden="true" />
                </Transition>
              </button>
            </div>
          </div>
          
          <div class="input-footer">
            <p id="input-hint" class="input-hint">
              <kbd>Enter</kbd> 发送 · <kbd>Shift + Enter</kbd> 换行
              <span v-if="isNearLimit" class="char-warning" :class="{ 'char-error': isOverLimit }">
                · {{ charCount }}/{{ maxChars }}
              </span>
            </p>
            <p class="disclaimer">AI生成内容仅供参考，不构成诊断建议</p>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<style scoped>
.fade-scale-enter-active {
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
}

.fade-scale-leave-active {
  transition: opacity 0.2s ease-in, transform 0.2s ease-in;
}

.fade-scale-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.fade-scale-leave-to {
  opacity: 0;
  transform: scale(1.05);
}

.message-list-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.message-list-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute;
  width: 100%;
}

.message-list-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.message-list-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.message-list-move {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-icon-enter-active,
.btn-icon-leave-active {
  transition: all 0.2s ease;
}

.btn-icon-enter-from,
.btn-icon-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.chat-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--spacing-6) * 2);
  max-height: calc(100vh - var(--spacing-6) * 2);
}

.welcome-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-8);
  text-align: center;
}

.welcome-header {
  margin-bottom: var(--spacing-8);
}

.welcome-title {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-2) 0;
}

.welcome-subtitle {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
  margin: 0;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-8);
  width: 100%;
  max-width: 640px;
}

.quick-questions {
  width: 100%;
  max-width: 480px;
}

.quick-title {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: 0 0 var(--spacing-3) 0;
}

.question-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  justify-content: center;
}

.question-item {
  padding: var(--spacing-2) var(--spacing-4);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.question-item:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background-color: var(--color-primary-bg);
}

.question-item:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.chat-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  position: relative;
}

.upload-area {
  padding: var(--spacing-4);
}

.upload-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: var(--spacing-8);
  background-color: var(--color-surface);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.upload-box:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-bg);
}

.upload-box:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.upload-icon {
  width: 48px;
  height: 48px;
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-3);
}

.upload-text {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-1) 0;
}

.upload-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: 0;
}

.input-section {
  padding: var(--spacing-4) var(--spacing-6);
  background-color: var(--color-bg-primary);
}

.input-container {
  max-width: 800px;
  margin: 0 auto;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-2);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-2) var(--spacing-3);
  box-shadow: var(--shadow-sm);
  transition: border-color var(--transition-fast);
}

.input-wrapper:focus-within {
  border-color: var(--color-primary);
}

.textarea-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
}

.input-textarea {
  width: 100%;
  min-height: 44px;
  max-height: 140px;
  padding: var(--spacing-3) var(--spacing-2);
  background: transparent;
  border: none;
  outline: none;
  font-size: var(--font-size-base);
  line-height: 1.5;
  color: var(--color-text-primary);
  resize: none;
}

.input-textarea::placeholder {
  color: var(--color-text-tertiary);
}

.input-textarea.input-error::placeholder {
  color: var(--color-error);
}

.input-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  padding-left: var(--spacing-2);
  border-left: 1px solid var(--color-border-light);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background-color: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.action-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.action-btn :deep(svg) {
  width: 20px;
  height: 20px;
}

.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: var(--color-text-inverse);
  border-radius: var(--radius-full);
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
  transition: all var(--transition-fast);
}

.send-btn:hover:not(:disabled) {
  box-shadow: 0 4px 16px rgba(14, 165, 233, 0.4);
  transform: scale(1.05);
}

.send-btn:active:not(:disabled) {
  transform: scale(0.95);
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
}

.send-btn:disabled {
  background: var(--color-bg-tertiary);
  box-shadow: none;
  cursor: not-allowed;
}

.send-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.send-btn :deep(svg) {
  width: 20px;
  height: 20px;
  margin-left: 2px;
}

.loading-icon {
  width: 20px;
  height: 20px;
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-2);
  padding: 0 var(--spacing-2);
}

.input-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: 0;
}

.input-hint kbd {
  display: inline-block;
  padding: 2px 6px;
  font-size: var(--font-size-xs);
  font-family: inherit;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.char-warning {
  color: var(--color-warning);
  font-weight: var(--font-weight-medium);
}

.char-warning.char-error {
  color: var(--color-error);
}

.disclaimer {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: 0;
}

@media (max-width: 767px) {
  .feature-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .welcome-section {
    padding: var(--spacing-4);
  }

  .welcome-title {
    font-size: var(--font-size-2xl);
  }

  .input-section {
    padding: var(--spacing-3) var(--spacing-4);
  }

  .input-wrapper {
    padding: var(--spacing-2);
    border-radius: var(--radius-xl);
  }

  .input-actions {
    gap: var(--spacing-1);
    padding-left: var(--spacing-1);
    border-left: none;
  }

  .action-btn,
  .send-btn {
    width: 36px;
    height: 36px;
  }

  .action-btn :deep(svg),
  .send-btn :deep(svg) {
    width: 18px;
    height: 18px;
  }

  .input-footer {
    flex-direction: column;
    gap: var(--spacing-1);
    align-items: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fade-scale-enter-active,
  .fade-scale-leave-active,
  .message-list-enter-active,
  .message-list-leave-active,
  .btn-icon-enter-active,
  .btn-icon-leave-active {
    transition: none;
  }
}
</style>
