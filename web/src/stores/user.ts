import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { setAccessToken, getAccessToken } from '@/services/api'

export interface User {
  id: string
  phone?: string
  nickname: string
  avatar?: string
  email?: string
}

const USER_STORAGE_KEY = 'user'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const isLoggedIn = computed(() => !!user.value && !!getAccessToken())

  const login = (userData: User, userToken: string) => {
    user.value = userData
    setAccessToken(userToken)
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData))
  }

  const logout = () => {
    user.value = null
    setAccessToken(null)
    localStorage.removeItem(USER_STORAGE_KEY)
  }

  const updateUser = (userData: Partial<User>) => {
    if (user.value) {
      user.value = { ...user.value, ...userData }
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user.value))
    }
  }

  const initFromStorage = () => {
    const token = getAccessToken()
    const storedUser = localStorage.getItem(USER_STORAGE_KEY)
    
    if (token && storedUser) {
      try {
        user.value = JSON.parse(storedUser)
      } catch {
        logout()
      }
    }
  }

  return {
    user,
    isLoggedIn,
    login,
    logout,
    updateUser,
    initFromStorage
  }
})
