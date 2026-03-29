const API_BASE_URL = 'https://karlee-insides-cellularly.ngrok-free.dev/api/v1'

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
        error: data.error || { message: '请求失败' },
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
    fetchApi<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    }),

  register: (phone: string, password: string, code: string) =>
    fetchApi<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phone, password, code }),
    }),

  sendCode: (phone: string) =>
    fetchApi<void>('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  logout: () =>
    fetchApi<void>('/auth/logout', {
      method: 'POST',
    }),

  refresh: () =>
    fetchApi<{ accessToken: string; user: User }>('/auth/refresh', {
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
        useRAG: false,
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

  complete: (content: string) =>
    fetchApi<{ content: string }>('/chat/complete', {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  health: () =>
    fetchApi<{ llm: string; rag: { documents: number; chunks: number } }>('/chat/health'),
}

export const conversationApi = {
  list: (page = 1, limit = 20) =>
    fetchApi<Conversation[]>(`/conversations?page=${page}&limit=${limit}`),

  get: (id: string) =>
    fetchApi<Conversation>(`/conversations/${id}`),

  create: (type: 'CHAT' | 'SEARCH' | 'REPORT' | 'DRUG' = 'CHAT', title?: string) =>
    fetchApi<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ type, title }),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/conversations/${id}`, {
      method: 'DELETE',
    }),
}

export const userApi = {
  me: () => fetchApi<User>('/users/me'),

  updateProfile: (data: { nickname?: string; email?: string }) =>
    fetchApi<User>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    fetchApi<void>('/users/me/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  deleteAccount: () =>
    fetchApi<void>('/users/me', {
      method: 'DELETE',
    }),
}
