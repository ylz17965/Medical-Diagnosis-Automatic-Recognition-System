const API_BASE_URL = '/api/v1'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { message: string; code?: string }
}

interface User {
  id: string
  phone: string
  email?: string
  nickname: string
  avatarUrl?: string
  status: string
  createdAt: string
}

interface LoginResponse {
  user: User
  accessToken: string
}

interface Source {
  source: string
  content: string
}

interface Citation {
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
  doi?: string
  link?: string
  citationContent: string
  citationContext: string
  relevanceScore: number
}

interface DeepSearchResult {
  totalSearched: number
  totalCited: number
  citations: Citation[]
  searchSummary: string
}

interface Message {
  id: string
  role: 'USER' | 'ASSISTANT'
  content: string
  sources?: Source[]
  citations?: Citation[]
  deepSearchResult?: DeepSearchResult
  createdAt: string
}

interface Conversation {
  id: string
  type: 'CHAT' | 'SEARCH' | 'REPORT' | 'DRUG'
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

interface DrugInfo {
  name: string
  genericName?: string
  manufacturer?: string
  approvalNumber?: string
  specification?: string
  ingredients?: string[]
  indications?: string
  contraindications?: string
  sideEffects?: string
  usage?: string
  storage?: string
}

interface ReportItem {
  name: string
  value: string
  unit?: string
  referenceRange?: string
  isAbnormal?: boolean
  note?: string
}

interface ReportInfo {
  patientName?: string
  reportDate?: string
  reportType?: string
  items: ReportItem[]
  abnormalItems: ReportItem[]
  summary?: string
}

interface ImageAnalyzeResponse {
  type: 'drug' | 'report'
  result: DrugInfo | ReportInfo
  interpretation?: string
}

interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  retryableStatuses: number[]
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
}

let accessToken: string | null = localStorage.getItem('accessToken')

function getCustomApiHeaders(): Record<string, string> {
  const stored = localStorage.getItem('settings')
  if (!stored) return {}
  try {
    const settings = JSON.parse(stored)
    if (!settings.apiKeys?.useCustomKey || !settings.apiKeys?.qwen?.apiKey) return {}
    const q = settings.apiKeys.qwen
    const headers: Record<string, string> = {
      'x-api-key': q.apiKey,
      'x-api-base-url': q.baseUrl,
    }
    if (q.complexModel) headers['x-model-complex'] = q.complexModel
    if (q.simpleModel) headers['x-model-simple'] = q.simpleModel
    if (q.visionModel) headers['x-model-vision'] = q.visionModel
    if (q.embeddingModel) headers['x-model-embedding'] = q.embeddingModel
    return headers
  } catch {
    return {}
  }
}

function getSessionId(): string {
  let sessionId = localStorage.getItem('chatSessionId')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('chatSessionId', sessionId)
  }
  return sessionId
}

export function setAccessToken(token: string | null) {
  accessToken = token
  if (token) {
    localStorage.setItem('accessToken', token)
  } else {
    localStorage.removeItem('accessToken')
  }
}

export function getAccessToken() {
  return accessToken
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * 0.1 * exponentialDelay
  return Math.min(exponentialDelay + jitter, maxDelay)
}

async function fetchWithRetry<T>(
  endpoint: string,
  options: RequestInit = {},
  retryConfig: Partial<RetryConfig> = {}
): Promise<ApiResponse<T>> {
  const config = { ...defaultRetryConfig, ...retryConfig }
  let lastError: { message: string; code?: string } = { message: '请求失败' }

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await fetchApi<T>(endpoint, options)
      
      if (result.success) {
        return result
      }

      const statusCode = (result.error as any)?.status
      if (!config.retryableStatuses.includes(statusCode)) {
        return result
      }

      lastError = result.error || lastError

      if (attempt < config.maxRetries) {
        const delayMs = calculateDelay(attempt, config.baseDelay, config.maxDelay)
        await delay(delayMs)
      }
    } catch (error) {
      lastError = { message: error instanceof Error ? error.message : '网络错误' }
      
      if (attempt < config.maxRetries) {
        const delayMs = calculateDelay(attempt, config.baseDelay, config.maxDelay)
        await delay(delayMs)
      }
    }
  }

  return {
    success: false,
    error: lastError
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...getCustomApiHeaders(),
  }

  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    })

    const data = await response.json()

    if (!response.ok) {
      if (response.status === 401) {
        setAccessToken(null)
        window.location.href = '/login'
      }
      return {
        success: false,
        error: { ...data.error, message: data.error?.message || '请求失败', status: response.status },
      }
    }

    return {
      success: true,
      data: data.data ?? data,
    }
  } catch (error) {
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : '网络错误' },
    }
  }
}

export const authApi = {
  login: (phone: string, password?: string, code?: string, email?: string) =>
    fetchWithRetry<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password, code, email }),
    }),

  register: (phone: string, password: string, code: string, nickname?: string) =>
    fetchWithRetry<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phone, password, code, nickname }),
    }),

  sendCode: (phone: string, purpose: 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD' = 'LOGIN') =>
    fetchWithRetry<{ message: string; code?: string }>('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone, type: 'PHONE', purpose }),
    }),

  resetPassword: (phone: string, code: string, newPassword: string) =>
    fetchWithRetry<void>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ phone, code, newPassword }),
    }),

  logout: () =>
    fetchWithRetry<void>('/auth/logout', {
      method: 'POST',
    }),

}

export const chatApi = {
  stream: async (
    content: string,
    onChunk: (chunk: { 
      content?: string
      done?: boolean
      conversationId?: string
      sessionId?: string
      sources?: Source[]
      citations?: Citation[]
      deepSearchResult?: DeepSearchResult
      agentUsed?: { id: string; name: string; emoji: string }
    }) => Promise<void> | void,
    conversationId?: string,
    type: 'CHAT' | 'SEARCH' | 'REPORT' | 'DRUG' = 'CHAT',
    modelType?: 'auto' | 'complex' | 'simple',
  ): Promise<void> => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'x-session-id': getSessionId(),
      ...getCustomApiHeaders(),
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const body: Record<string, unknown> = {
      content,
      conversationId,
      type,
      useRAG: true,
    }

    if (modelType && modelType !== 'auto') {
      body.modelType = modelType
    }

    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json()
      onChunk({ content: error.error?.message || '请求失败', done: true })
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      onChunk({ content: '无法读取响应', done: true })
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const parsed = JSON.parse(data)
              await onChunk(parsed)
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  },
}

export const userApi = {
  me: () => fetchWithRetry<User>('/users/me'),

  updateProfile: (data: { nickname?: string; email?: string }) =>
    fetchWithRetry<User>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    fetchWithRetry<void>('/users/me/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  deleteAccount: () =>
    fetchWithRetry<void>('/users/me', {
      method: 'DELETE',
    }),

  uploadAvatar: async (file: File): Promise<ApiResponse<User>> => {
    const formData = new FormData()
    formData.append('avatar', file)

    const headers: HeadersInit = {}
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/me/avatar`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: { message: data.error?.message || '头像上传失败' },
        }
      }

      return {
        success: true,
        data: data.data,
      }
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : '网络错误' },
      }
    }
  },
}

export const imageApi = {
  analyze: async (
    file: File,
    type: 'drug' | 'report',
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<ImageAnalyzeResponse>> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const headers: HeadersInit = {}
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    try {
      const response = await fetch(`${API_BASE_URL}/image/analyze`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: { message: data.error?.message || '图片分析失败' },
        }
      }

      onProgress?.(100)
      return {
        success: true,
        data: data.data,
      }
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : '网络错误' },
      }
    }
  },

  analyzeStream: async (
    file: File,
    type: 'drug' | 'report',
    onProgress?: (progress: number) => void
  ): Promise<Response> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const headers: HeadersInit = {}
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }
    const customHeaders = getCustomApiHeaders()
    Object.assign(headers, customHeaders)

    onProgress?.(50)

    const response = await fetch(`${API_BASE_URL}/image/analyze`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    })

    onProgress?.(100)
    return response
  },
}

export type { User, Message, Conversation, DrugInfo, ReportItem, ReportInfo, ImageAnalyzeResponse, Source, Citation, DeepSearchResult }

interface KnowledgeDocument {
  id: string
  title: string
  content: string
  source: string
  category: string
  metadata: Record<string, unknown>
  chunkCount: number
  createdAt: string
  updatedAt: string
}

interface KnowledgeStats {
  totalDocuments: number
  totalChunks: number
  categories: string[]
}

interface KnowledgeSearchResult {
  content: string
  source: string
  score: number
  metadata?: Record<string, unknown>
}

export const knowledgeApi = {
  getStats: () => fetchWithRetry<KnowledgeStats>('/knowledge/stats'),

  getDocuments: (params?: { category?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.category) query.set('category', params.category)
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    const qs = query.toString()
    return fetchWithRetry<{ documents: KnowledgeDocument[]; total: number }>(`/knowledge/documents${qs ? '?' + qs : ''}`)
  },

  createDocument: (data: { title: string; content: string; source: string; category: string }) =>
    fetchWithRetry<{ id: string }>('/knowledge/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteDocument: (id: string) =>
    fetchWithRetry<void>(`/knowledge/documents/${id}`, {
      method: 'DELETE',
    }),

  batchDelete: (ids: string[]) =>
    fetchWithRetry<{ deleted: number }>('/knowledge/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  search: (query: string, category?: string, topK?: number) =>
    fetchWithRetry<KnowledgeSearchResult[]>('/knowledge/search', {
      method: 'POST',
      body: JSON.stringify({ query, category, topK }),
    }),
}
