import { ref, computed } from 'vue'
import { userApi } from '@/services/api'

interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface PasswordErrors {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
  submit?: string
}

export function usePasswordModal() {
  const showModal = ref(false)
  const loading = ref(false)
  const success = ref(false)
  const errors = ref<PasswordErrors>({})
  const form = ref<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const isValid = computed(() => {
    return form.value.currentPassword &&
      form.value.newPassword.length >= 8 &&
      form.value.newPassword === form.value.confirmPassword
  })

  const open = () => {
    form.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
    errors.value = {}
    success.value = false
    showModal.value = true
  }

  const close = () => {
    showModal.value = false
    form.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
    errors.value = {}
    success.value = false
  }

  const validate = (): boolean => {
    errors.value = {}

    if (!form.value.currentPassword) {
      errors.value.currentPassword = '请输入当前密码'
      return false
    }

    if (!form.value.newPassword) {
      errors.value.newPassword = '请输入新密码'
      return false
    }

    if (form.value.newPassword.length < 8) {
      errors.value.newPassword = '密码至少8位'
      return false
    }

    if (form.value.newPassword !== form.value.confirmPassword) {
      errors.value.confirmPassword = '两次密码不一致'
      return false
    }

    return true
  }

  const submit = async (onSuccess?: () => void) => {
    if (!validate()) return false

    loading.value = true

    try {
      const result = await userApi.changePassword(
        form.value.currentPassword,
        form.value.newPassword
      )

      if (!result.success) {
        const msg = result.error?.message || '修改失败'
        if (msg.includes('当前密码') || msg.includes('密码错误')) {
          errors.value.currentPassword = msg
        } else {
          errors.value.submit = msg
        }
        return false
      }

      success.value = true

      setTimeout(() => {
        close()
        onSuccess?.()
      }, 2000)

      return true
    } catch {
      errors.value.submit = '修改失败，请重试'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    showModal,
    loading,
    success,
    errors,
    form,
    isValid,
    open,
    close,
    validate,
    submit
  }
}
