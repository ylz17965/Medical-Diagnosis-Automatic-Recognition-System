import { ref } from 'vue'

export function useAvatarModal() {
  const showModal = ref(false)
  const loading = ref(false)

  const open = () => {
    showModal.value = true
  }

  const close = () => {
    showModal.value = false
  }

  const changeAvatar = async (onSuccess: (avatarUrl: string) => void) => {
    loading.value = true

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const newAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + Date.now()
      onSuccess(newAvatar)
      close()
      return true
    } finally {
      loading.value = false
    }
  }

  return {
    showModal,
    loading,
    open,
    close,
    changeAvatar
  }
}
