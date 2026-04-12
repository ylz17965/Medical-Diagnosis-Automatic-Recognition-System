import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Source {
  source: string
  content: string
}

export interface Citation {
  id: string
  type: string
  typeLabel: string
  title: string
  authors: string
  journal: string
  year: number
  volume?: string
  issue?: string
  impactFactor: number | null
  citationContent: string
  citationContext: string
  relevanceScore: number
}

export interface DeepSearchResult {
  totalSearched: number
  totalCited: number
  citations: Citation[]
  searchSummary: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: Source[]
  citations?: Citation[]
  deepSearchResult?: DeepSearchResult
  loading?: boolean
  streaming?: boolean
  imageUrl?: string
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  mode?: 'chat' | 'search' | 'qa' | 'report' | 'drug' | 'lung' | 'heart' | 'lung-ct'
}

export const useConversationStore = defineStore('conversation', () => {
  const conversations = ref<Conversation[]>([])
  const activeId = ref<string>('')
  const activeConversation = computed(() => 
    conversations.value.find(c => c.id === activeId.value)
  )

  const createConversation = (mode: 'chat' | 'search' | 'qa' | 'report' | 'drug' | 'lung' | 'heart' | 'lung-ct' = 'chat') => {
    const newConversation: Conversation = {
      id: generateId(),
      title: '新对话',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      mode
    }
    conversations.value.unshift(newConversation)
    activeId.value = newConversation.id
    saveToStorage()
    return newConversation
  }

  const selectConversation = (id: string) => {
    activeId.value = id
  }

  const deleteConversation = (id: string) => {
    const index = conversations.value.findIndex(c => c.id === id)
    if (index !== -1) {
      conversations.value.splice(index, 1)
      if (activeId.value === id) {
        activeId.value = conversations.value[0]?.id || ''
      }
      saveToStorage()
    }
  }

  const addMessage = (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
    const conversation = conversations.value.find(c => c.id === conversationId)
    if (conversation) {
      const newMessage: Message = {
        ...message,
        id: generateId(),
        timestamp: new Date()
      }
      conversation.messages.push(newMessage)
      conversation.updatedAt = new Date()
      
      if (conversation.messages.length === 1 && message.role === 'user') {
        conversation.title = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '')
      }
      
      saveToStorage()
      return newMessage
    }
    return null
  }

  const updateMessage = (conversationId: string, messageId: string, updates: Partial<Message>) => {
    const conversation = conversations.value.find(c => c.id === conversationId)
    if (conversation) {
      const message = conversation.messages.find(m => m.id === messageId)
      if (message) {
        Object.assign(message, updates)
        saveToStorage()
      }
    }
  }

  const clearConversations = () => {
    conversations.value = []
    activeId.value = ''
    saveToStorage()
  }

  const saveToStorage = () => {
    const dataToStore = conversations.value.map(c => ({
      ...c,
      messages: c.messages.map(m => {
        const { imageUrl, ...rest } = m
        return rest
      })
    }))
    localStorage.setItem('conversations', JSON.stringify(dataToStore))
  }

  const loadFromStorage = () => {
    const stored = localStorage.getItem('conversations')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        conversations.value = parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
          messages: c.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }))
        if (conversations.value.length > 0) {
          activeId.value = conversations.value[0].id
        }
      } catch {
        conversations.value = []
      }
    }
  }

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  return {
    conversations,
    activeId,
    activeConversation,
    createConversation,
    selectConversation,
    deleteConversation,
    addMessage,
    updateMessage,
    clearConversations,
    loadFromStorage
  }
})
