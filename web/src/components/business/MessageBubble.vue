<script setup lang="ts">
import { computed, ref } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import IconAI from '@/components/icons/IconAI.vue'
import IconCopy from '@/components/icons/IconCopy.vue'
import IconChevronDown from '@/components/icons/IconChevronDown.vue'
import BlockchainAttestation from './BlockchainAttestation.vue'
import { useToast } from '@/composables'
import type { Source, Citation, DeepSearchResult } from '@/services/api'

interface BlockchainAttestationData {
  txHash: string
  blockNumber?: number
  timestamp?: string
  contentHash?: string
  network?: string
}

interface Props {
  type?: 'user' | 'ai'
  content: string
  avatar?: string
  sources?: Source[]
  citations?: Citation[]
  deepSearchResult?: DeepSearchResult
  loading?: boolean
  streaming?: boolean
  timestamp?: Date
  messageId?: string
  imageUrl?: string
  attestation?: BlockchainAttestationData
}

const props = withDefaults(defineProps<Props>(), {
  type: 'user',
  content: '',
  avatar: '',
  sources: () => [],
  citations: () => [],
  loading: false,
  streaming: false,
  messageId: '',
  imageUrl: '',
  attestation: undefined
})

const emit = defineEmits<{
  sourceClick: [source: Source]
  citationClick: [citation: Citation]
  attest: [messageId: string]
}>()

const toast = useToast()
const isCopied = ref(false)
const showCitations = ref(false)
const selectedCitation = ref<Citation | null>(null)
const isAttesting = ref(false)
const expandedSources = ref(new Set<number>())

const toggleSourceExpand = (index: number) => {
  if (expandedSources.value.has(index)) {
    expandedSources.value.delete(index)
  } else {
    expandedSources.value.add(index)
  }
}

const isSourceExpanded = (index: number) => expandedSources.value.has(index)

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

const hasCitations = computed(() => {
  if (props.deepSearchResult?.citations && props.deepSearchResult.citations.length > 0) {
    return true
  }
  if (props.citations && props.citations.length > 0) {
    return true
  }
  if (!props.sources || props.sources.length === 0) return false
  const citationPattern = /\[\d+\]/g
  const matches = props.content.match(citationPattern)
  if (!matches) return false
  const citedNumbers = new Set(matches.map(m => parseInt(m.slice(1, -1))))
  return citedNumbers.size > 0
})

const displayCitations = computed(() => {
  if (props.deepSearchResult?.citations && props.deepSearchResult.citations.length > 0) {
    return props.deepSearchResult.citations
  }
  if (props.citations && props.citations.length > 0) {
    return props.citations
  }
  return []
})

const displaySearchSummary = computed(() => {
  if (props.deepSearchResult?.searchSummary) {
    return props.deepSearchResult.searchSummary
  }
  return `引用 ${props.sources?.length || 0} 条资料`
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

const toggleCitations = () => {
  showCitations.value = !showCitations.value
}

const closeCitationDetail = () => {
  selectedCitation.value = null
}

const formatImpactFactor = (if_: number | null) => {
  if (if_ === null) return ''
  return if_.toFixed(3)
}

const handleAttest = async () => {
  if (!props.messageId || isAttesting.value) return
  
  isAttesting.value = true
  try {
    emit('attest', props.messageId)
    toast.success('存证请求已发送', '正在将诊断建议上链...')
  } catch (error) {
    toast.error('存证失败', '请稍后重试')
  } finally {
    isAttesting.value = false
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
        
        <div v-if="hasCitations && !loading" class="message-citations">
          <button class="citations-toggle" @click="toggleCitations">
            <span class="citations-summary">{{ displaySearchSummary }}</span>
            <IconChevronDown :class="['toggle-icon', { 'is-open': showCitations }]" />
          </button>
          
          <div v-if="showCitations" class="citations-panel">
            <div class="citations-header">
              <span class="citations-title">引用资料({{ displayCitations.length > 0 ? displayCitations.length : sources.length }})</span>
            </div>
            <div class="citations-list">
              <template v-if="displayCitations.length > 0">
                <div
                  v-for="(citation, index) in displayCitations"
                  :key="citation.id"
                  class="citation-item"
                  :class="{ 'is-expanded': isSourceExpanded(index) }"
                >
                  <button class="citation-header" @click="toggleSourceExpand(index)">
                    <div class="citation-index">{{ index + 1 }}</div>
                    <div class="citation-info">
                      <div class="citation-type-badge">{{ citation.typeLabel }}</div>
                      <div class="citation-title">{{ citation.title }}</div>
                      <div class="citation-meta">
                        <span>{{ citation.authors }}</span>
                        <span v-if="citation.impactFactor" class="impact-factor">IF: {{ citation.impactFactor.toFixed(2) }}</span>
                      </div>
                    </div>
                    <IconChevronDown :class="['expand-icon', { 'is-open': isSourceExpanded(index) }]" />
                  </button>
                  <div v-if="isSourceExpanded(index)" class="citation-content">
                    <div class="citation-detail">
                      <div class="detail-row">
                        <span class="detail-label">来源：</span>
                        <span>{{ citation.journal }}, {{ citation.year }}</span>
                      </div>
                      <div v-if="citation.doi" class="detail-row">
                        <span class="detail-label">DOI：</span>
                        <a :href="`https://doi.org/${citation.doi}`" target="_blank" rel="noopener noreferrer" class="doi-link">{{ citation.doi }}</a>
                      </div>
                      <div v-if="citation.link" class="detail-row">
                        <span class="detail-label">链接：</span>
                        <a :href="citation.link" target="_blank" rel="noopener noreferrer" class="paper-link">查看原文</a>
                      </div>
                      <div class="detail-row citation-content-row">
                        <span class="detail-label">引用内容：</span>
                        <p class="citation-text">{{ citation.citationContent }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div
                  v-for="(source, index) in sources"
                  :key="index"
                  class="citation-item"
                  :class="{ 'is-expanded': isSourceExpanded(index) }"
                >
                  <button class="citation-header" @click="toggleSourceExpand(index)">
                    <div class="citation-index">{{ index + 1 }}</div>
                    <div class="citation-info">
                      <div class="citation-type">{{ source.source }}</div>
                      <div class="citation-title">{{ source.content?.substring(0, 80) }}...</div>
                    </div>
                    <IconChevronDown :class="['expand-icon', { 'is-open': isSourceExpanded(index) }]" />
                  </button>
                  <div v-if="isSourceExpanded(index)" class="citation-content">
                    {{ source.content }}
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
        
        <div v-else-if="sources.length > 0 && !loading && !hasCitations" class="message-sources">
          <span class="sources-label">引用来源：</span>
          <button
            v-for="(source, index) in sources"
            :key="index"
            class="source-item"
            @click="toggleSourceExpand(index)"
          >
            {{ source.source }}
          </button>
          <div v-if="expandedSources.size > 0" class="expanded-sources">
            <div v-for="(source, index) in sources" :key="'expanded-' + index">
              <div v-if="isSourceExpanded(index)" class="expanded-source-item">
                <div class="expanded-source-header">
                  <span class="expanded-source-index">[{{ index + 1 }}]</span>
                  <span class="expanded-source-type">{{ source.source }}</span>
                </div>
                <div class="expanded-source-content">{{ source.content }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <button
          v-if="type === 'ai' && !loading && content"
          :class="['copy-btn', { 'is-copied': isCopied }]"
          :aria-label="isCopied ? '已复制' : '复制消息'"
          @click="copyContent"
        >
          <IconCopy aria-hidden="true" />
        </button>
        
        <button
          v-if="type === 'ai' && !loading && content && !attestation"
          class="attest-btn"
          :disabled="isAttesting"
          @click="handleAttest"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <span>{{ isAttesting ? '存证中...' : '区块链存证' }}</span>
        </button>
        
        <BlockchainAttestation
          v-if="attestation"
          :tx-hash="attestation.txHash"
          :block-number="attestation.blockNumber"
          :timestamp="attestation.timestamp"
          :content-hash="attestation.contentHash"
          :network="attestation.network"
        />
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
    
    <Teleport to="body">
      <div v-if="selectedCitation" class="citation-modal-overlay" @click="closeCitationDetail">
        <div class="citation-modal" @click.stop>
          <button class="modal-close" @click="closeCitationDetail">×</button>
          <div class="modal-header">
            <span class="modal-type">{{ selectedCitation.typeLabel }}</span>
            <h3 class="modal-title">{{ selectedCitation.title }}</h3>
          </div>
          <div class="modal-body">
            <div class="modal-section">
              <div class="section-label">作者</div>
              <div class="section-content">{{ selectedCitation.authors }}</div>
            </div>
            <div class="modal-section">
              <div class="section-label">期刊/来源</div>
              <div class="section-content">{{ selectedCitation.journal }}, {{ selectedCitation.year }}</div>
            </div>
            <div v-if="selectedCitation.impactFactor" class="modal-section">
              <div class="section-label">影响因子</div>
              <div class="section-content impact-factor-highlight">{{ formatImpactFactor(selectedCitation.impactFactor) }}</div>
            </div>
            <div v-if="selectedCitation.doi" class="modal-section">
              <div class="section-label">DOI</div>
              <div class="section-content">
                <a :href="`https://doi.org/${selectedCitation.doi}`" target="_blank" rel="noopener noreferrer" class="doi-link">
                  {{ selectedCitation.doi }}
                </a>
              </div>
            </div>
            <div v-if="selectedCitation.link" class="modal-section">
              <div class="section-label">论文链接</div>
              <div class="section-content">
                <a :href="selectedCitation.link" target="_blank" rel="noopener noreferrer" class="paper-link">
                  🔗 查看原文
                </a>
              </div>
            </div>
            <div class="modal-section">
              <div class="section-label">引用段落</div>
              <div class="section-content citation-content">{{ selectedCitation.citationContent }}</div>
            </div>
            <div class="modal-section">
              <div class="section-label">上下文</div>
              <div class="section-content">{{ selectedCitation.citationContext }}</div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
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

.message-citations {
  margin-top: var(--spacing-3);
  padding-top: var(--spacing-3);
  border-top: 1px solid var(--color-separator);
}

.citations-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--spacing-2) var(--spacing-3);
  background: var(--color-fill-primary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.citations-toggle:hover {
  background: var(--color-fill-secondary);
}

.citations-summary {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
}

.toggle-icon {
  width: 16px;
  height: 16px;
  color: var(--color-primary);
  transition: transform var(--transition-fast);
}

.toggle-icon.is-open {
  transform: rotate(180deg);
}

.citations-panel {
  margin-top: var(--spacing-2);
  background: var(--color-surface-elevated);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-separator);
  overflow: hidden;
}

.citations-header {
  padding: var(--spacing-2) var(--spacing-3);
  background: var(--color-fill-tertiary);
  border-bottom: 1px solid var(--color-separator);
}

.citations-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
}

.citations-list {
  max-height: 300px;
  overflow-y: auto;
}

.citation-item {
  display: flex;
  flex-direction: column;
  width: 100%;
  border-bottom: 1px solid var(--color-separator);
  transition: background var(--transition-fast);
}

.citation-item:last-child {
  border-bottom: none;
}

.citation-item.is-expanded {
  background: var(--color-fill-primary);
}

.citation-header {
  display: flex;
  gap: var(--spacing-3);
  width: 100%;
  padding: var(--spacing-3);
  text-align: left;
  border: none;
  background: transparent;
  cursor: pointer;
  align-items: center;
}

.citation-header:hover {
  background: var(--color-fill-primary);
}

.expand-icon {
  width: 16px;
  height: 16px;
  color: var(--color-text-tertiary);
  transition: transform var(--transition-base);
  flex-shrink: 0;
}

.expand-icon.is-open {
  transform: rotate(180deg);
}

.citation-content {
  padding: 0 var(--spacing-3) var(--spacing-3) var(--spacing-3);
  margin-left: 36px;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--color-fill-secondary);
  border-radius: var(--radius-md);
  padding: var(--spacing-3);
  margin-right: var(--spacing-3);
}

.citation-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: var(--color-primary-gradient);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-inverse);
  flex-shrink: 0;
}

.citation-info {
  flex: 1;
  min-width: 0;
}

.citation-type {
  display: inline-block;
  padding: 2px 6px;
  background: var(--color-fill-secondary);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-1);
}

.citation-type-badge {
  display: inline-block;
  padding: 2px 8px;
  background: var(--color-primary-gradient);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-inverse);
  margin-bottom: var(--spacing-1);
}

.citation-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.citation-meta {
  display: flex;
  gap: var(--spacing-2);
  margin-top: var(--spacing-1);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.citation-detail {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.detail-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1);
  font-size: var(--font-size-sm);
}

.detail-label {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.citation-text {
  margin: var(--spacing-1) 0 0 0;
  padding: var(--spacing-2);
  background: var(--color-fill-tertiary);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--color-primary);
  font-style: italic;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.citation-content-row {
  flex-direction: column;
  align-items: flex-start;
}

.impact-factor {
  color: var(--color-success);
  font-weight: var(--font-weight-medium);
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

.expanded-sources {
  width: 100%;
  margin-top: var(--spacing-3);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.expanded-source-item {
  background: var(--color-fill-secondary);
  border-radius: var(--radius-md);
  padding: var(--spacing-3);
}

.expanded-source-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-2);
}

.expanded-source-index {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.expanded-source-type {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.expanded-source-content {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
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

.attest-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  margin-top: var(--spacing-2);
  padding: var(--spacing-1) var(--spacing-2);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: var(--radius-md);
  color: #818cf8;
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.attest-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
  border-color: rgba(99, 102, 241, 0.5);
}

.attest-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.attest-btn svg {
  width: 14px;
  height: 14px;
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

.citation-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-4);
}

.citation-modal {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  max-width: 560px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
  position: relative;
}

.modal-close {
  position: absolute;
  top: var(--spacing-3);
  right: var(--spacing-3);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.modal-close:hover {
  background: var(--color-fill-tertiary);
  color: var(--color-text-primary);
}

.modal-header {
  padding: var(--spacing-4) var(--spacing-5);
  border-bottom: 1px solid var(--color-separator);
}

.modal-type {
  display: inline-block;
  padding: var(--spacing-1) var(--spacing-2);
  background: var(--color-primary-gradient);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-inverse);
  margin-bottom: var(--spacing-2);
}

.modal-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  line-height: 1.4;
  margin: 0;
}

.modal-body {
  padding: var(--spacing-4) var(--spacing-5);
}

.modal-section {
  margin-bottom: var(--spacing-4);
}

.modal-section:last-child {
  margin-bottom: 0;
}

.section-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-content {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  line-height: 1.6;
}

.impact-factor-highlight {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-success);
}

.citation-content {
  padding: var(--spacing-3);
  background: var(--color-fill-tertiary);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--color-primary);
  font-style: italic;
}

.doi-link,
.paper-link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-fast);
}

.doi-link:hover,
.paper-link:hover {
  text-decoration: underline;
  color: var(--color-primary-dark);
}

.paper-link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-2) var(--spacing-3);
  background: var(--color-fill-primary);
  border-radius: var(--radius-md);
}

.paper-link:hover {
  background: var(--color-fill-secondary);
}

@media (max-width: 767px) {
  .message-bubble {
    max-width: 85%;
  }
  
  .copy-btn {
    opacity: 1;
  }

  .citation-modal {
    max-height: 90vh;
    margin: var(--spacing-2);
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
