<script setup lang="ts">
import { ref } from 'vue'
import { Modal } from '@/components/base'

interface Props {
  modelValue: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const activeTab = ref<'guide' | 'faq' | 'shortcuts'>('guide')

const shortcuts = [
  { key: 'Enter', description: '发送消息' },
  { key: 'Shift + Enter', description: '换行' },
  { key: 'Esc', description: '关闭弹窗' }
]

const faqs = [
  {
    question: '如何开始一次健康咨询？',
    answer: '在聊天界面输入您的健康问题，AI助手会为您提供专业建议。您也可以选择特定功能模式，如深度搜索、健康问答等。'
  },
  {
    question: '体检报告如何解读？',
    answer: '点击"报告解读"功能，上传您的体检报告图片或PDF文件，AI助手会为您详细解读各项指标。'
  },
  {
    question: '药品识别功能如何使用？',
    answer: '点击"药品识别"功能，拍摄或上传药盒照片，AI助手会识别药品并提供用法用量、注意事项等信息。'
  },
  {
    question: '我的数据安全吗？',
    answer: '我们高度重视您的隐私安全。所有对话数据均经过加密存储，您可以在设置中随时清除历史记录。'
  },
  {
    question: 'AI建议是否可以替代医生诊断？',
    answer: 'AI助手提供的建议仅供参考，不能替代专业医生的诊断。如有严重症状，请及时就医。'
  }
]

const close = () => {
  emit('update:modelValue', false)
}
</script>

<template>
  <Modal
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    title="帮助中心"
    size="lg"
  >
    <div class="help-content">
      <div class="tabs" role="tablist">
        <button
          :class="['tab', { active: activeTab === 'guide' }]"
          role="tab"
          :aria-selected="activeTab === 'guide'"
          @click="activeTab = 'guide'"
        >
          使用指南
        </button>
        <button
          :class="['tab', { active: activeTab === 'faq' }]"
          role="tab"
          :aria-selected="activeTab === 'faq'"
          @click="activeTab = 'faq'"
        >
          常见问题
        </button>
        <button
          :class="['tab', { active: activeTab === 'shortcuts' }]"
          role="tab"
          :aria-selected="activeTab === 'shortcuts'"
          @click="activeTab = 'shortcuts'"
        >
          快捷键
        </button>
      </div>
      
      <div class="tab-content">
        <Transition name="fade-slide" mode="out-in">
          <div v-if="activeTab === 'guide'" key="guide" class="guide-section">
            <div class="guide-item">
              <div class="guide-icon">💬</div>
              <div class="guide-text">
                <h4>开始对话</h4>
                <p>在输入框中输入您的健康问题，按 Enter 发送，AI助手会为您提供专业建议。</p>
              </div>
            </div>
            
            <div class="guide-item">
              <div class="guide-icon">🔍</div>
              <div class="guide-text">
                <h4>深度搜索</h4>
                <p>选择"深度搜索"模式，输入医学问题，AI会从权威医学资料中为您查找相关信息。</p>
              </div>
            </div>
            
            <div class="guide-item">
              <div class="guide-icon">📋</div>
              <div class="guide-text">
                <h4>报告解读</h4>
                <p>上传体检报告图片，AI会为您解读各项指标，并提供健康建议。</p>
              </div>
            </div>
            
            <div class="guide-item">
              <div class="guide-icon">💊</div>
              <div class="guide-text">
                <h4>药品识别</h4>
                <p>拍摄或上传药盒照片，AI会识别药品信息，包括用法用量和注意事项。</p>
              </div>
            </div>
          </div>
          
          <div v-else-if="activeTab === 'faq'" key="faq" class="faq-section">
            <div v-for="(faq, index) in faqs" :key="index" class="faq-item">
              <h4 class="faq-question">{{ faq.question }}</h4>
              <p class="faq-answer">{{ faq.answer }}</p>
            </div>
          </div>
          
          <div v-else key="shortcuts" class="shortcuts-section">
            <div class="shortcuts-list">
              <div v-for="(shortcut, index) in shortcuts" :key="index" class="shortcut-item">
                <kbd class="shortcut-key">{{ shortcut.key }}</kbd>
                <span class="shortcut-desc">{{ shortcut.description }}</span>
              </div>
            </div>
            
            <div class="tips">
              <h4>💡 小提示</h4>
              <ul>
                <li>支持多行输入，按 Shift + Enter 换行</li>
                <li>可以上传图片进行报告解读或药品识别</li>
                <li>历史对话会自动保存，可随时查看</li>
              </ul>
            </div>
          </div>
        </Transition>
      </div>
    </div>
    
    <template #footer>
      <button class="close-btn" @click="close">我知道了</button>
    </template>
  </Modal>
</template>

<style scoped>
.help-content {
  min-height: 300px;
}

.tabs {
  display: flex;
  gap: var(--spacing-1);
  padding: var(--spacing-1);
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-5);
}

.tab {
  flex: 1;
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.tab:hover {
  color: var(--color-text-primary);
}

.tab.active {
  background-color: var(--color-surface);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.tab-content {
  position: relative;
}

.fade-slide-enter-active {
  transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.fade-slide-leave-active {
  transition: all 0.15s cubic-bezier(0.4, 0, 1, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(16px) scale(0.98);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-16px) scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .fade-slide-enter-active,
  .fade-slide-leave-active {
    transition: opacity 0.15s ease;
  }
  
  .fade-slide-enter-from,
  .fade-slide-leave-to {
    transform: none;
  }
}

.guide-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.guide-item {
  display: flex;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-lg);
}

.guide-icon {
  font-size: var(--font-size-2xl);
  flex-shrink: 0;
}

.guide-text h4 {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-1) 0;
}

.guide-text p {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.6;
}

.faq-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.faq-item {
  padding: var(--spacing-4);
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-lg);
}

.faq-question {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-2) 0;
}

.faq-answer {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.6;
}

.shortcuts-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-5);
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.shortcut-key {
  display: inline-block;
  min-width: 100px;
  padding: var(--spacing-2) var(--spacing-3);
  font-size: var(--font-size-sm);
  font-family: var(--font-family-mono);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  text-align: center;
}

.shortcut-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.tips {
  padding: var(--spacing-4);
  background-color: var(--color-primary-bg);
  border-radius: var(--radius-lg);
}

.tips h4 {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
  margin: 0 0 var(--spacing-2) 0;
}

.tips ul {
  margin: 0;
  padding-left: var(--spacing-5);
}

.tips li {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-1);
}

.close-btn {
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4);
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
  border-radius: var(--radius-lg);
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-fast);
}

.close-btn:hover {
  background-color: var(--color-primary-dark);
}
</style>
