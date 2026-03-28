import { ref, computed } from 'vue'
import type { FeatureType } from '@/components/business'
import { useConversationStore, useUserStore } from '@/stores'
import { chatApi, getAccessToken } from '@/services/api'

export function useChat() {
  const conversationStore = useConversationStore()
  const userStore = useUserStore()

  const inputMessage = ref('')
  const currentMode = ref<FeatureType | 'chat'>('chat')
  const isLoading = ref(false)
  const isUploading = ref(false)
  const serverConversationId = ref<string | undefined>(undefined)

  const hasMessages = computed(() => 
    conversationStore.activeConversation && 
    conversationStore.activeConversation.messages.length > 0
  )

  const isEmpty = computed(() => !inputMessage.value.trim())

  const charCount = computed(() => inputMessage.value.length)
  const maxChars = 2000
  const isNearLimit = computed(() => charCount.value > maxChars * 0.8)
  const isOverLimit = computed(() => charCount.value > maxChars)

  const modePrompts: Record<FeatureType, string> = {
    search: '您已进入深度搜索模式，请输入您想要搜索的医学问题，我将为您查找权威资料。',
    qa: '您已进入健康问答模式，请描述您的健康问题，我将为您提供专业建议。',
    report: '请上传您的体检报告，我将为您解读各项指标。',
    drug: '请上传药盒照片，我将为您识别药品信息。'
  }

  const modeToType: Record<FeatureType | 'chat', 'CHAT' | 'SEARCH' | 'REPORT' | 'DRUG'> = {
    search: 'SEARCH',
    qa: 'CHAT',
    report: 'REPORT',
    drug: 'DRUG',
    chat: 'CHAT'
  }

  const setMode = (type: FeatureType) => {
    currentMode.value = type
    serverConversationId.value = undefined
    conversationStore.createConversation(type)
    conversationStore.addMessage(conversationStore.activeId, {
      role: 'assistant',
      content: modePrompts[type]
    })
  }

  const sendMessage = async () => {
    if (isEmpty.value || isLoading.value || isOverLimit.value) return

    const message = inputMessage.value.trim()
    inputMessage.value = ''

    if (!conversationStore.activeConversation) {
      conversationStore.createConversation('chat')
    }

    conversationStore.addMessage(conversationStore.activeId, {
      role: 'user',
      content: message
    })

    return { message, mode: currentMode.value }
  }

  const sendToBackend = async (userMessage: string, mode: FeatureType | 'chat') => {
    isLoading.value = true

    const loadingMessage = conversationStore.addMessage(conversationStore.activeId, {
      role: 'assistant',
      content: '',
      loading: true
    })

    let fullContent = ''
    let sources: Array<{ source: string; content: string }> = []

    try {
      await chatApi.stream(
        userMessage,
        (chunk) => {
          if (chunk.content) {
            fullContent += chunk.content
            if (loadingMessage) {
              conversationStore.updateMessage(conversationStore.activeId, loadingMessage.id, {
                content: fullContent,
                loading: false
              })
            }
          }
          if (chunk.conversationId) {
            serverConversationId.value = chunk.conversationId
          }
          if (chunk.sources) {
            sources = chunk.sources
          }
          if (chunk.done) {
            if (loadingMessage) {
              conversationStore.updateMessage(conversationStore.activeId, loadingMessage.id, {
                content: fullContent,
                loading: false,
                sources: sources.length > 0 ? sources : undefined
              })
            }
          }
        },
        serverConversationId.value,
        modeToType[mode]
      )
    } catch (error) {
      console.error('Chat error:', error)
      if (loadingMessage) {
        conversationStore.updateMessage(conversationStore.activeId, loadingMessage.id, {
          content: '抱歉，生成回复时出现错误，请稍后重试。',
          loading: false
        })
      }
    }

    isLoading.value = false
  }

  const simulateResponse = async (userMessage: string, mode: FeatureType | 'chat') => {
    await sendToBackend(userMessage, mode)
  }

  const handleFileUpload = async (file: File) => {
    if (!file) return

    isUploading.value = true

    conversationStore.addMessage(conversationStore.activeId, {
      role: 'user',
      content: `已上传报告：${file.name}`
    })

    await sendToBackend(`分析体检报告：${file.name}`, 'report')

    isUploading.value = false
  }

  const initAuth = () => {
    const token = getAccessToken()
    if (token) {
      userStore.initFromStorage()
    }
  }

  return {
    inputMessage,
    currentMode,
    isLoading,
    isUploading,
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
    conversationStore,
    initAuth
  }
}
