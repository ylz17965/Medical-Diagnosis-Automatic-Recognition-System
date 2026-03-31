<script setup lang="ts">
import { computed, ref } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import IconAI from '@/components/icons/IconAI.vue'
import IconCopy from '@/components/icons/IconCopy.vue'
import { useToast } from '@/composables'

interface Source {
  source: string
  content: string
}

interface Props {
  type?: 'user' | 'ai'
  content: string
  avatar?: string
  sources?: Source[]
  loading?: boolean
  streaming?: boolean
  timestamp?: Date
  messageId?: string
  imageUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'user',
  content: '',
  avatar: '',
  sources: () => [],
  loading: false,
  streaming: false,
  messageId: '',
  imageUrl: ''
})

defineEmits<{
  sourceClick: [source: Source]
}>()

const toast = useToast()
const isCopied = ref(false)

const bubbleClasses = computed(() => [
  'message-bubble',
  `message-${props.type}`
])

const renderedContent = computed(() => {
  if (props.loading || props.streaming) return props.content
  const rawHtml = marked.parse(props.content, { breaks: true }) as string
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  })
})

const formatTime = (date?: Date) => {
  if (!date) return ''
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const copyContent = async () => {
  try {
    await navigator.clipboard.writeText(props.content)
    isCopied.value = true
    toast.success('复制成功', '消息已复制到剪贴板')
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch {
    toast.error('复制失败', '无法复制到剪贴板')
  }
}
</script>

<template>
  <div :class="bubbleClasses">
    <div v-if="type === 'ai'" class="message-avatar">
      <div class="ai-avatar">
        <IconAI />
      </div>
    </div>
    
    <div class="message-content-wrapper">
      <div v-if="imageUrl && type === 'user'" class="message-image">
        <img :src="imageUrl" alt="上传的图片" />
      </div>
      <div class="message-content">
        <div v-if="loading" class="message-loading">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="loading-text">正在思考...</span>
        </div>
        <div v-else class="message-text-wrapper">
          <div v-if="streaming" class="message-text streaming-text">{{ content }}<span class="streaming-cursor"></span></div>
          <div v-else class="message-text" v-html="renderedContent"></div>
        </div>
        
        <div v-if="sources.length > 0 && !loading" class="message-sources">
          <span class="sources-label">引用来源：</span>
          <button
            v-for="(source, index) in sources"
            :key="index"
            class="source-item"
            @click="$emit('sourceClick', source)"
          >
            {{ source.source }}
          </button>
        </div>
        
        <button
          v-if="type === 'ai' && !loading && content"
          :class="['copy-btn', { 'is-copied': isCopied }]"
          :aria-label="isCopied ? '已复制' : '复制消息'"
          @click="copyContent"
        >
          <IconCopy aria-hidden="true" />
        </button>
      </div>
      
      <div v-if="timestamp" class="message-time">
        {{ formatTime(timestamp) }}
      </div>
    </div>
    
    <div v-if="type === 'user'" class="message-avatar">
      <div class="user-avatar">
        <img v-if="avatar" :src="avatar" alt="用户头像" />
        <span v-else>我</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-bubble {
  display: flex;
  gap: var(--spacing-3);
  max-width: min(680px, 60%);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-user {
  flex-direction: row-reverse;
  margin-left: auto;
}

.message-ai {
  margin-right: auto;
}

.message-avatar {
  flex-shrink: 0;
}

.ai-avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-inverse);
}

.ai-avatar :deep(svg) {
  width: 20px;
  height: 20px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, var(--color-fill-primary), var(--color-fill-secondary));
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  letter-spacing: var(--letter-spacing-normal);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.message-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  min-width: 0;
}

.message-image {
  max-width: 240px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: var(--spacing-2);
}

.message-image img {
  width: 100%;
  height: auto;
  display: block;
}

.message-content {
  position: relative;
  padding: var(--spacing-3) var(--spacing-4);
  border-radius: var(--radius-xl);
  font-size: var(--font-size-base);
  line-height: var(--line-height-body);
  letter-spacing: var(--letter-spacing-body);
}

.message-user .message-content {
  background: var(--color-primary-gradient);
  color: var(--color-text-inverse);
  border-bottom-right-radius: var(--radius-sm);
}

.message-ai .message-content {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  border-bottom-left-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
}

.message-text {
  word-break: break-word;
}

.streaming-text {
  white-space: pre-wrap;
}

.message-text :deep(p) {
  margin: 0 0 var(--spacing-2) 0;
}

.message-text :deep(p:last-child) {
  margin-bottom: 0;
}

.message-text-wrapper {
  display: inline;
}

.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 1.2em;
  background: linear-gradient(180deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink 1s step-end infinite;
}

.message-user .streaming-cursor {
  background: rgba(255, 255, 255, 0.9);
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.message-text :deep(h1),
.message-text :deep(h2),
.message-text :deep(h3),
.message-text :deep(h4),
.message-text :deep(h5),
.message-text :deep(h6) {
  margin-top: var(--spacing-3);
  margin-bottom: var(--spacing-2);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-headline);
}

.message-text :deep(h1) { font-size: var(--font-size-xl); }
.message-text :deep(h2) { font-size: var(--font-size-lg); }
.message-text :deep(h3) { font-size: var(--font-size-base); }

.message-text :deep(ul),
.message-text :deep(ol) {
  margin: var(--spacing-2) 0;
  padding-left: var(--spacing-5);
}

.message-text :deep(li) {
  margin-bottom: var(--spacing-1);
}

.message-text :deep(strong) {
  font-weight: var(--font-weight-semibold);
}

.message-text :deep(a) {
  color: var(--color-text-link);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.message-user .message-text :deep(a) {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: underline;
}

.message-loading {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.typing-dot {
  width: 8px;
  height: 8px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
  border-radius: var(--radius-full);
  animation: typing 1.4s ease-in-out infinite;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
  }
}

.loading-text {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  letter-spacing: var(--letter-spacing-normal);
}

.message-sources {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-2);
  margin-top: var(--spacing-3);
  padding-top: var(--spacing-3);
  border-top: 1px solid var(--color-separator);
}

.sources-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-tertiary);
  letter-spacing: var(--letter-spacing-caption);
}

.source-item {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  padding: var(--spacing-1) var(--spacing-2);
  background-color: var(--color-fill-primary);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  letter-spacing: var(--letter-spacing-caption);
}

.source-item:hover {
  background: var(--color-primary-gradient);
  color: var(--color-text-inverse);
}

.copy-btn {
  position: absolute;
  top: var(--spacing-2);
  right: var(--spacing-2);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--color-text-quaternary);
  border-radius: var(--radius-md);
  opacity: 0;
  transition: all var(--transition-fast);
}

.copy-btn:hover {
  background-color: var(--color-fill-tertiary);
  color: var(--color-text-secondary);
}

.copy-btn.is-copied {
  color: var(--color-success);
}

.message-content:hover .copy-btn {
  opacity: 1;
}

.copy-btn :deep(svg) {
  width: 16px;
  height: 16px;
}

.message-time {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-regular);
  color: var(--color-text-quaternary);
  letter-spacing: var(--letter-spacing-caption);
}

.message-user .message-time {
  text-align: right;
}

@media (max-width: 767px) {
  .message-bubble {
    max-width: 85%;
  }
  
  .copy-btn {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .message-bubble {
    animation: none;
  }
  
  .typing-dot {
    animation: none;
  }
  
  .streaming-cursor {
    animation: none;
    opacity: 1;
  }
}
</style>
