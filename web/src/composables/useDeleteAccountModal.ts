import { ref, computed } from 'vue'

export function useDeleteAccountModal() {
  const showModal = ref(false)
  const loading = ref(false)
  const confirmText = ref('')

  const isValid = computed(() => confirmText.value === '确认注销')

  const open = () => {
    confirmText.value = ''
    showModal.value = true
  }

  const close = () => {
    showModal.value = false
    confirmText.value = ''
  }

  const confirm = async (onSuccess: () => void) => {
    if (!isValid.value) return false

    loading.value = true

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      onSuccess()
      return true
    } finally {
      loading.value = false
    }
  }

  return {
    showModal,
    loading,
    confirmText,
    isValid,
    open,
    close,
    confirm
  }
}
