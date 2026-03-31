import { ref, computed, nextTick } from 'vue'
import type { FeatureType } from '@/components/business'
import { useConversationStore, useUserStore } from '@/stores'
import { chatApi, imageApi, getAccessToken } from '@/services/api'
import type { DrugInfo, ReportInfo } from '@/services/api'

export function useChat() {
  const conversationStore = useConversationStore()
  const userStore = useUserStore()

  const inputMessage = ref('')
  const currentMode = ref<FeatureType | 'chat'>('chat')
  const isLoading = ref(false)
  const isUploading = ref(false)
  const uploadProgress = ref(0)
  const serverConversationId = ref<string | undefined>(undefined)
  const uploadedImage = ref<{ url: string; file: File } | null>(null)

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
    uploadedImage.value = null
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
    let messageEl = loadingMessage

    const updateContent = async (newContent: string) => {
      fullContent = newContent
      if (messageEl) {
        conversationStore.updateMessage(conversationStore.activeId, messageEl.id, {
          content: fullContent,
          loading: false
        })
        await nextTick()
        await new Promise(resolve => setTimeout(resolve, 30))
      }
    }

    try {
      await chatApi.stream(
        userMessage,
        async (chunk) => {
          if (chunk.content) {
            fullContent += chunk.content
            await updateContent(fullContent)
          }
          if (chunk.conversationId) {
            serverConversationId.value = chunk.conversationId
          }
          if (chunk.sources) {
            sources = chunk.sources
          }
          if (chunk.done) {
            if (messageEl) {
              conversationStore.updateMessage(conversationStore.activeId, messageEl.id, {
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
      if (messageEl) {
        conversationStore.updateMessage(conversationStore.activeId, messageEl.id, {
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
    uploadProgress.value = 0

    const imageUrl = URL.createObjectURL(file)
    uploadedImage.value = { url: imageUrl, file }

    const isReportMode = currentMode.value === 'report'
    const imageType = isReportMode ? 'report' : 'drug'
    const modeLabel = isReportMode ? '体检报告' : '药盒'

    conversationStore.addMessage(conversationStore.activeId, {
      role: 'user',
      content: `已上传${modeLabel}：${file.name}`,
      imageUrl
    })

    const loadingMessage = conversationStore.addMessage(conversationStore.activeId, {
      role: 'assistant',
      content: `正在识别${modeLabel}，请稍候...`,
      loading: true
    })

    try {
      const result = await imageApi.analyze(file, imageType, (progress) => {
        uploadProgress.value = progress
      })

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || `${modeLabel}识别失败`)
      }

      const { interpretation, result: analysisResult } = result.data

      if (loadingMessage) {
        conversationStore.updateMessage(conversationStore.activeId, loadingMessage.id, {
          content: interpretation || `${modeLabel}识别完成`,
          loading: false
        })
      }

      if (isReportMode) {
        const reportInfo = analysisResult as ReportInfo
        if (reportInfo.abnormalItems && reportInfo.abnormalItems.length > 0) {
          const abnormalList = reportInfo.abnormalItems
            .map(item => `- ${item.name}: ${item.value}${item.unit || ''}（参考范围：${item.referenceRange || '未知'}）`)
            .join('\n')
          
          conversationStore.addMessage(conversationStore.activeId, {
            role: 'assistant',
            content: `**检测到以下异常指标：**\n\n${abnormalList}\n\n---\n\n${interpretation || ''}`
          })
        }
      } else {
        const drugInfo = analysisResult as DrugInfo
        if (drugInfo.name) {
          const drugDetails = [
            drugInfo.genericName ? `**通用名：** ${drugInfo.genericName}` : null,
            drugInfo.manufacturer ? `**生产厂家：** ${drugInfo.manufacturer}` : null,
            drugInfo.specification ? `**规格：** ${drugInfo.specification}` : null,
            drugInfo.indications ? `**适应症：** ${drugInfo.indications}` : null,
            drugInfo.usage ? `**用法用量：** ${drugInfo.usage}` : null,
            drugInfo.contraindications ? `**禁忌症：** ${drugInfo.contraindications}` : null,
            drugInfo.sideEffects ? `**副作用：** ${drugInfo.sideEffects}` : null,
          ].filter(Boolean).join('\n\n')

          conversationStore.addMessage(conversationStore.activeId, {
            role: 'assistant',
            content: `**识别结果：${drugInfo.name}**\n\n${drugDetails}\n\n---\n\n${interpretation || ''}`
          })
        }
      }

    } catch (error) {
      console.error('Image analysis error:', error)
      if (loadingMessage) {
        conversationStore.updateMessage(conversationStore.activeId, loadingMessage.id, {
          content: `抱歉，${modeLabel}识别失败：${error instanceof Error ? error.message : '未知错误'}`,
          loading: false
        })
      }
    }

    isUploading.value = false
    uploadProgress.value = 0
  }

  const clearUploadedImage = () => {
    if (uploadedImage.value) {
      URL.revokeObjectURL(uploadedImage.value.url)
      uploadedImage.value = null
    }
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
    uploadProgress,
    uploadedImage,
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
    clearUploadedImage,
    userStore,
    conversationStore,
    initAuth
  }
}
