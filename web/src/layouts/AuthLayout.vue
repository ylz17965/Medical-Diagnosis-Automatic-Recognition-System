<script setup lang="ts">
interface Props {
  title?: string
  subtitle?: string
}

withDefaults(defineProps<Props>(), {
  title: '智疗助手',
  subtitle: 'AI医疗自助服务'
})
</script>

<template>
  <div class="auth-layout">
    <div class="auth-container">
      <div class="auth-header">
        <div class="logo">
          <svg viewBox="0 0 40 40" class="logo-icon">
            <circle cx="20" cy="20" r="18" fill="currentColor" opacity="0.1" />
            <path
              d="M20 8c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12S26.627 8 20 8zm0 22c-5.523 0-10-4.477-10-10s4.477-10 10-10 10 4.477 10 10-4.477 10-10 10z"
              fill="currentColor"
            />
            <path
              d="M20 14c-3.314 0-6 2.686-6 6s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 10c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z"
              fill="currentColor"
            />
          </svg>
        </div>
        <h1 class="auth-title">{{ title }}</h1>
        <p class="auth-subtitle">{{ subtitle }}</p>
      </div>
      <div class="auth-content">
        <slot />
      </div>
      <div class="auth-footer">
        <p class="disclaimer">
          AI生成内容仅供参考，不构成诊断建议
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--spacing-6);
  background: linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-primary-bg) 100%);
}

.auth-container {
  width: 100%;
  max-width: 420px;
  background-color: var(--color-surface);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
}

.auth-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-8) var(--spacing-6) var(--spacing-6);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: var(--color-text-inverse);
}

.logo {
  margin-bottom: var(--spacing-4);
}

.logo-icon {
  width: 56px;
  height: 56px;
  color: var(--color-text-inverse);
}

.auth-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--spacing-2) 0;
}

.auth-subtitle {
  font-size: var(--font-size-sm);
  opacity: 0.9;
  margin: 0;
}

.auth-content {
  padding: var(--spacing-6);
}

.auth-footer {
  padding: var(--spacing-4) var(--spacing-6);
  background-color: var(--color-bg-tertiary);
  text-align: center;
}

.disclaimer {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: 0;
}

@media (max-width: 767px) {
  .auth-layout {
    padding: var(--spacing-4);
  }

  .auth-header {
    padding: var(--spacing-6) var(--spacing-4) var(--spacing-4);
  }

  .auth-content {
    padding: var(--spacing-4);
  }
}
</style>
