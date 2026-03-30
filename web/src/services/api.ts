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

interface Message {
  id: string
  role: 'USER' | 'ASSISTANT'
  content: string
  sources?: Array<{ source: string; content: string }>
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
  login: (phone: string, password: string) =>
    fetchWithRetry<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    }),

  register: (phone: string, password: string, code: string) =>
    fetchWithRetry<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phone, password, code }),
    }),

  sendCode: (phone: string) =>
    fetchWithRetry<void>('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  logout: () =>
    fetchWithRetry<void>('/auth/logout', {
      method: 'POST',
    }),

  refresh: () =>
    fetchWithRetry<{ accessToken: string; user: User }>('/auth/refresh', {
      method: 'POST',
    }),
}

export const chatApi = {
  stream: async (
    content: string,
    onChunk: (chunk: { content?: string; done?: boolean; conversationId?: string; sources?: Array<{ source: string; content: string }> }) => void,
    conversationId?: string,
    type: 'CHAT' | 'SEARCH' | 'REPORT' | 'DRUG' = 'CHAT',
  ): Promise<void> => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        content,
        conversationId,
        type,
        useRAG: true,
      }),
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
              onChunk(parsed)
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

  complete: (content: string, type: 'CHAT' | 'SEARCH' | 'REPORT' | 'DRUG' = 'CHAT') =>
    fetchWithRetry<{ content: string }>('/chat/complete', {
      method: 'POST',
      body: JSON.stringify({ content, type, useRAG: true }),
    }),

  health: () =>
    fetchWithRetry<{ llm: string; rag: { documents: number; chunks: number } }>('/chat/health'),
}

export const conversationApi = {
  list: (page = 1, limit = 20) =>
    fetchWithRetry<Conversation[]>(`/conversations?page=${page}&limit=${limit}`),

  get: (id: string) =>
    fetchWithRetry<Conversation>(`/conversations/${id}`),

  create: (type: 'CHAT' | 'SEARCH' | 'REPORT' | 'DRUG' = 'CHAT', title?: string) =>
    fetchWithRetry<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ type, title }),
    }),

  delete: (id: string) =>
    fetchWithRetry<void>(`/conversations/${id}`, {
      method: 'DELETE',
    }),
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

  recognizeDrug: async (file: File): Promise<ApiResponse<DrugInfo>> => {
    const formData = new FormData()
    formData.append('file', file)

    const headers: HeadersInit = {}
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    try {
      const response = await fetch(`${API_BASE_URL}/image/recognize-drug`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: { message: data.error?.message || '药品识别失败' },
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

  extractReport: async (file: File): Promise<ApiResponse<ReportInfo>> => {
    const formData = new FormData()
    formData.append('file', file)

    const headers: HeadersInit = {}
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    try {
      const response = await fetch(`${API_BASE_URL}/image/extract-report`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: { message: data.error?.message || '报告提取失败' },
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

export type { User, Message, Conversation, DrugInfo, ReportItem, ReportInfo, ImageAnalyzeResponse }
