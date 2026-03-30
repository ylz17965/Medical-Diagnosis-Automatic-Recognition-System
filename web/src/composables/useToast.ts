import { ref, readonly } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  title: string
  message?: string
  duration: number
  dismissible: boolean
}

const toasts = ref<ToastMessage[]>([])

let toastId = 0

const generateId = () => {
  toastId += 1
  return `toast-${toastId}-${Date.now()}`
}

const defaultOptions = {
  duration: 4000,
  dismissible: true
}

function addToast(
  type: ToastType,
  title: string,
  message?: string,
  options?: Partial<{ duration: number; dismissible: boolean }>
): string {
  const id = generateId()
  const toast: ToastMessage = {
    id,
    type,
    title,
    message,
    duration: options?.duration ?? defaultOptions.duration,
    dismissible: options?.dismissible ?? defaultOptions.dismissible
  }

  toasts.value.push(toast)

  if (toast.duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, toast.duration)
  }

  return id
}

function removeToast(id: string) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

function clearAll() {
  toasts.value = []
}

export function useToast() {
  return {
    toasts: readonly(toasts),
    success: (title: string, message?: string, options?: Partial<{ duration: number; dismissible: boolean }>) =>
      addToast('success', title, message, options),
    error: (title: string, message?: string, options?: Partial<{ duration: number; dismissible: boolean }>) =>
      addToast('error', title, message, options),
    warning: (title: string, message?: string, options?: Partial<{ duration: number; dismissible: boolean }>) =>
      addToast('warning', title, message, options),
    info: (title: string, message?: string, options?: Partial<{ duration: number; dismissible: boolean }>) =>
      addToast('info', title, message, options),
    remove: removeToast,
    clearAll
  }
}
