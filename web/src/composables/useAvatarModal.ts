import { ref } from 'vue'
import { userApi } from '@/services/api'

export function useAvatarModal() {
  const showModal = ref(false)
  const loading = ref(false)
  const error = ref('')

  const open = () => {
    error.value = ''
    showModal.value = true
  }

  const close = () => {
    showModal.value = false
    error.value = ''
  }

  const uploadAvatar = async (file: File, onSuccess: (avatarUrl: string) => void) => {
    loading.value = true
    error.value = ''

    try {
      const result = await userApi.uploadAvatar(file)

      if (!result.success) {
        error.value = result.error?.message || '头像上传失败'
        return false
      }

      if (result.data?.avatarUrl) {
        onSuccess(result.data.avatarUrl)
      }

      close()
      return true
    } catch {
      error.value = '头像上传失败，请重试'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    showModal,
    loading,
    error,
    open,
    close,
    uploadAvatar
  }
}
