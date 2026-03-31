import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark' | 'system'

export interface Settings {
  theme: Theme
  notifications: boolean
  soundEnabled: boolean
  fontSize: 'small' | 'medium' | 'large'
  language: string
}

const defaultSettings: Settings = {
  theme: 'light',
  notifications: true,
  soundEnabled: true,
  fontSize: 'medium',
  language: 'zh-CN'
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
    loadFromStorage,
    resetSettings
  }
})
