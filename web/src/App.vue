<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'
import { RouterView } from 'vue-router'
import { ToastContainer } from '@/components/base'
import { useToast } from '@/composables'

const toast = useToast()
const hasError = ref(false)
const errorMessage = ref('')

onErrorCaptured((error: Error) => {
  console.error('Global error captured:', error)
  hasError.value = true
  errorMessage.value = error.message || '发生未知错误'
  toast.error('应用错误', error.message || '发生未知错误，请刷新页面重试')
  return false
})
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <Transition name="page-fade" mode="out-in">
      <component :is="Component" :key="route.path" />
    </Transition>
  </RouterView>
  <ToastContainer />
</template>

<style>
.page-fade-enter-active {
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
}

.page-fade-leave-active {
  transition: opacity 0.2s ease-in, transform 0.2s ease-in;
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
