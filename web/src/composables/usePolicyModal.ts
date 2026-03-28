import { ref, computed } from 'vue'

type PolicyType = 'privacy' | 'terms'

export function usePolicyModal() {
  const showModal = ref(false)
  const policyType = ref<PolicyType>('privacy')

  const title = computed(() => 
    policyType.value === 'privacy' ? '隐私政策' : '用户协议'
  )

  const open = (type: PolicyType) => {
    policyType.value = type
    showModal.value = true
  }

  const close = () => {
    showModal.value = false
  }

  return {
    showModal,
    policyType,
    title,
    open,
    close
  }
}
