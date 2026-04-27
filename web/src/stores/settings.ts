import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark' | 'system'
export type ModelType = 'auto' | 'complex' | 'simple'

export interface ApiKeyConfig {
  qwen: {
    apiKey: string
    baseUrl: string
    complexModel: string
    simpleModel: string
    visionModel: string
    embeddingModel: string
  }
  useCustomKey: boolean
}

export interface Settings {
  theme: Theme
  notifications: boolean
  soundEnabled: boolean
  fontSize: 'small' | 'medium' | 'large'
  language: string
  modelType: ModelType
  apiKeys: ApiKeyConfig
}

const defaultApiKeys: ApiKeyConfig = {
  qwen: {
    apiKey: '',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    complexModel: 'qwen-max',
    simpleModel: 'qwen3.5-flash',
    visionModel: 'qwen3-vl-plus',
    embeddingModel: 'text-embedding-v3',
  },
  useCustomKey: false,
}

const defaultSettings: Settings = {
  theme: 'light',
  notifications: true,
  soundEnabled: true,
  fontSize: 'medium',
  language: 'zh-CN',
  modelType: 'auto',
  apiKeys: { ...defaultApiKeys },
}

const fontSizeMap = {
  small: '14px',
  medium: '16px',
  large: '18px'
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>({ ...defaultSettings })

  const updateSettings = (updates: Partial<Settings>) => {
    settings.value = { ...settings.value, ...updates }
    if (updates.fontSize) {
      applyFontSize(updates.fontSize)
    }
    saveToStorage()
  }

  const setTheme = (theme: Theme) => {
    settings.value.theme = theme
    applyTheme(theme)
    saveToStorage()
  }

  const setModelType = (modelType: ModelType) => {
    settings.value.modelType = modelType
    saveToStorage()
  }

  const updateApiKeys = (updates: Partial<ApiKeyConfig>) => {
    settings.value.apiKeys = { ...settings.value.apiKeys, ...updates }
    if (updates.qwen) {
      settings.value.apiKeys.qwen = { ...settings.value.apiKeys.qwen, ...updates.qwen }
    }
    saveToStorage()
  }

  const setUseCustomKey = (use: boolean) => {
    settings.value.apiKeys.useCustomKey = use
    saveToStorage()
  }

  const getApiHeaders = (): Record<string, string> => {
    if (!settings.value.apiKeys.useCustomKey || !settings.value.apiKeys.qwen.apiKey) {
      return {}
    }
    return {
      'x-api-key': settings.value.apiKeys.qwen.apiKey,
      'x-api-base-url': settings.value.apiKeys.qwen.baseUrl,
      'x-model-complex': settings.value.apiKeys.qwen.complexModel,
      'x-model-simple': settings.value.apiKeys.qwen.simpleModel,
      'x-model-vision': settings.value.apiKeys.qwen.visionModel,
    }
  }

  const hasCustomKey = () => {
    return settings.value.apiKeys.useCustomKey && !!settings.value.apiKeys.qwen.apiKey
  }

  const applyTheme = (theme: Theme) => {
    let effectiveTheme = theme
    if (theme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(effectiveTheme)
  }

  const applyFontSize = (size: 'small' | 'medium' | 'large') => {
    document.documentElement.style.fontSize = fontSizeMap[size]
  }

  const saveToStorage = () => {
    localStorage.setItem('settings', JSON.stringify(settings.value))
  }

  const loadFromStorage = () => {
    const stored = localStorage.getItem('settings')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        settings.value = { ...defaultSettings, ...parsed }
      } catch {
        settings.value = { ...defaultSettings }
      }
    }
    applyTheme(settings.value.theme)
    applyFontSize(settings.value.fontSize)
  }

  const resetSettings = () => {
    settings.value = { ...defaultSettings }
    applyTheme(defaultSettings.theme)
    applyFontSize(defaultSettings.fontSize)
    saveToStorage()
  }

  watch(() => settings.value.theme, (theme) => {
    applyTheme(theme)
  })

  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (settings.value.theme === 'system') {
        applyTheme('system')
      }
    })
  }

  return {
    settings,
    updateSettings,
    setTheme,
    setModelType,
    updateApiKeys,
    setUseCustomKey,
    getApiHeaders,
    hasCustomKey,
    loadFromStorage,
    resetSettings
  }
})
