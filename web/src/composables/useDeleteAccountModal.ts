import { ref, computed } from 'vue'
import { userApi } from '@/services/api'
import { useUserStore } from '@/stores'
import { useRouter } from 'vue-router'

export function useDeleteAccountModal() {
  const showModal = ref(false)
  const loading = ref(false)
  const confirmText = ref('')
  const error = ref('')

  const isValid = computed(() => confirmText.value === '确认注销')

  const open = () => {
    confirmText.value = ''
    error.value = ''
    showModal.value = true
  }

  const close = () => {
    showModal.value = false
    confirmText.value = ''
    error.value = ''
  }

  const confirm = async (onSuccess: () => void) => {
    if (!isValid.value) return false

    loading.value = true

    try {
      const result = await userApi.deleteAccount()

      if (!result.success) {
        error.value = result.error?.message || '注销失败，请重试'
        return false
      }

      const userStore = useUserStore()
      const router = useRouter()

      userStore.logout()
      onSuccess()
      router.push('/login')
      return true
    } catch {
      error.value = '注销失败，请重试'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    showModal,
    loading,
    confirmText,
    error,
    isValid,
    open,
    close,
    confirm
  }
}
