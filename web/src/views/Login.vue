<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Button, Input } from '@/components/base'
import IconPhone from '@/components/icons/IconPhone.vue'
import IconLock from '@/components/icons/IconLock.vue'
import IconUser from '@/components/icons/IconUser.vue'
import { useUserStore } from '@/stores'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

type AuthMode = 'login' | 'register' | 'forgot'

const authMode = ref<AuthMode>('login')
const transitionDirection = ref<'right' | 'left'>('right')
const loginMethod = ref<'phone' | 'email'>('phone')
const loginForm = ref({
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
  code: '',
  nickname: ''
})
const loading = ref(false)
const errors = ref<Record<string, string>>({})
const codeSent = ref(false)
const countdown = ref(0)
const resetStep = ref(1)

const isLogin = computed(() => authMode.value === 'login')
const isRegister = computed(() => authMode.value === 'register')
const isForgot = computed(() => authMode.value === 'forgot')

const isPhoneValid = computed(() => /^1[3-9]\d{9}$/.test(loginForm.value.phone))
const isEmailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginForm.value.email))

const accountValue = computed({
  get: () => loginMethod.value === 'phone' ? loginForm.value.phone : loginForm.value.email,
  set: (val: string) => {
    if (loginMethod.value === 'phone') {
      loginForm.value.phone = val
    } else {
      loginForm.value.email = val
    }
  }
})

const credentialValue = computed({
  get: () => loginMethod.value === 'phone' ? loginForm.value.code : loginForm.value.password,
  set: (val: string) => {
    if (loginMethod.value === 'phone') {
      loginForm.value.code = val
    } else {
      loginForm.value.password = val
    }
  }
})

const handleSendCode = () => {
  const targetValid = loginMethod.value === 'phone' ? isPhoneValid.value : isEmailValid.value
  const target = loginMethod.value === 'phone' ? 'phone' : 'email'
  
  if (!targetValid) {
    errors.value[target] = loginMethod.value === 'phone' ? '请输入正确的手机号' : '请输入正确的邮箱'
    return
  }
  
  errors.value = {}
  codeSent.value = true
  countdown.value = 60
  
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)
}

const handleSendCodeForReset = () => {
  if (!isEmailValid.value) {
    errors.value.email = '请输入正确的邮箱'
    return
  }
  
  errors.value = {}
  codeSent.value = true
  countdown.value = 60
  
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)
}

const handleVerifyCode = () => {
  errors.value = {}
  
  if (!loginForm.value.email) {
    errors.value.email = '请输入邮箱'
    return
  }
  if (!isEmailValid.value) {
    errors.value.email = '请输入正确的邮箱'
    return
  }
  if (!loginForm.value.code) {
    errors.value.code = '请输入验证码'
    return
  }
  if (loginForm.value.code !== '123456') {
    errors.value.code = '验证码错误'
    return
  }
  
  resetStep.value = 2
}

const validateForm = () => {
  errors.value = {}
  
  if (isRegister.value) {
    if (!loginForm.value.nickname) {
      errors.value.nickname = '请输入昵称'
      return false
    }
  }
  
  if (isForgot.value && resetStep.value === 1) {
    if (!loginForm.value.email) {
      errors.value.email = '请输入邮箱'
      return false
    }
    if (!isEmailValid.value) {
      errors.value.email = '请输入正确的邮箱'
      return false
    }
    if (!loginForm.value.code) {
      errors.value.code = '请输入验证码'
      return false
    }
    if (loginForm.value.code !== '123456') {
      errors.value.code = '验证码错误'
      return false
    }
    return true
  }
  
  if (isForgot.value && resetStep.value === 2) {
    if (!loginForm.value.password) {
      errors.value.password = '请输入新密码'
      return false
    }
    if (loginForm.value.password.length < 6) {
      errors.value.password = '密码至少6位'
      return false
    }
    if (loginForm.value.password !== loginForm.value.confirmPassword) {
      errors.value.confirmPassword = '两次密码不一致'
      return false
    }
    return true
  }
  
  if (loginMethod.value === 'phone' || isRegister.value) {
    if (!loginForm.value.phone) {
      errors.value.phone = '请输入手机号'
      return false
    }
    if (!isPhoneValid.value) {
      errors.value.phone = '请输入正确的手机号'
      return false
    }
  } else if (isLogin.value) {
    if (!loginForm.value.email) {
      errors.value.email = '请输入邮箱'
      return false
    }
    if (!isEmailValid.value) {
      errors.value.email = '请输入正确的邮箱'
      return false
    }
  }
  
  if (isLogin.value && loginMethod.value === 'phone') {
    if (!loginForm.value.code) {
      errors.value.code = '请输入验证码'
      return false
    }
    if (loginForm.value.code !== '123456') {
      errors.value.code = '验证码错误'
      return false
    }
  }
  
  if (isLogin.value && loginMethod.value === 'email') {
    if (!loginForm.value.password) {
      errors.value.password = '请输入密码'
      return false
    }
    if (loginForm.value.password.length < 6) {
      errors.value.password = '密码至少6位'
      return false
    }
  }
  
  if (isRegister.value) {
    if (!loginForm.value.code) {
      errors.value.code = '请输入验证码'
      return false
    }
    if (loginForm.value.code !== '123456') {
      errors.value.code = '验证码错误'
      return false
    }
    if (!loginForm.value.password) {
      errors.value.password = '请输入密码'
      return false
    }
    if (loginForm.value.password.length < 6) {
      errors.value.password = '密码至少6位'
      return false
    }
    if (loginForm.value.password !== loginForm.value.confirmPassword) {
      errors.value.confirmPassword = '两次密码不一致'
      return false
    }
  }
  
  return true
}

const handleSubmit = async () => {
  if (!validateForm()) return
  
  loading.value = true
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (isForgot.value && resetStep.value === 2) {
      resetStep.value = 3
      loading.value = false
      return
    }
    
    if (isForgot.value && resetStep.value === 1) {
      loading.value = false
      return
    }
    
    userStore.login({
      id: '1',
      phone: loginForm.value.phone || loginForm.value.email,
      nickname: loginForm.value.nickname || '用户' + (loginForm.value.phone || loginForm.value.email).slice(-4)
    }, 'mock-token-' + Date.now())
    
    const redirect = route.query.redirect as string
    router.push(redirect || '/')
  } catch {
    errors.value.submit = isLogin.value ? '登录失败，请重试' : '注册失败，请重试'
  } finally {
    loading.value = false
  }
}

const switchToRegister = () => {
  transitionDirection.value = 'left'
  authMode.value = 'register'
  resetForm()
}

const switchToLogin = () => {
  transitionDirection.value = 'right'
  authMode.value = 'login'
  resetForm()
}

const switchToForgot = () => {
  transitionDirection.value = 'left'
  authMode.value = 'forgot'
  resetForm()
}

const resetForm = () => {
  errors.value = {}
  loginForm.value = {
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    code: '',
    nickname: ''
  }
  codeSent.value = false
  countdown.value = 0
  resetStep.value = 1
}
</script>

<template>
  <div class="auth-page" :class="{ 'is-register-bg': isRegister || isForgot }">
    <div class="auth-container" :class="{ 'is-register': isRegister || isForgot }">
      <div class="form-card">
        <div class="form-card-inner">
          <Transition :name="transitionDirection === 'right' ? 'slide-right' : 'slide-left'" mode="out-in">
            <div v-if="isLogin" key="login" class="form-content">
              <div class="form-header">
                <h2 class="form-title">登入账号</h2>
                <p class="form-subtitle">使用您的账号登录</p>
              </div>
              
              <div class="login-method-tabs" role="tablist">
                <div class="tab-indicator" :class="{ 'tab-indicator-right': loginMethod === 'email' }"></div>
                <button
                  :class="['method-tab', { active: loginMethod === 'phone' }]"
                  role="tab"
                  :aria-selected="loginMethod === 'phone'"
                  @click="loginMethod = 'phone'"
                >
                  手机号
                </button>
                <button
                  :class="['method-tab', { active: loginMethod === 'email' }]"
                  role="tab"
                  :aria-selected="loginMethod === 'email'"
                  @click="loginMethod = 'email'"
                >
                  电子邮件
                </button>
              </div>
              
              <form class="auth-form" @submit.prevent="handleSubmit">
                <Input
                  v-model="accountValue"
                  :type="loginMethod === 'phone' ? 'tel' : 'email'"
                  :label="loginMethod === 'phone' ? '手机号' : '邮箱'"
                  :placeholder="loginMethod === 'phone' ? '请输入手机号' : '请输入邮箱'"
                  :error="loginMethod === 'phone' ? errors.phone : errors.email"
                  :maxlength="loginMethod === 'phone' ? 11 : undefined"
                >
                  <template #prefix>
                    <IconPhone v-if="loginMethod === 'phone'" />
                    <IconUser v-else />
                  </template>
                </Input>
                
                <Input
                  v-model="credentialValue"
                  :type="loginMethod === 'phone' ? 'text' : 'password'"
                  :label="loginMethod === 'phone' ? '验证码' : '密码'"
                  :placeholder="loginMethod === 'phone' ? '请输入验证码' : '请输入密码'"
                  :error="loginMethod === 'phone' ? errors.code : errors.password"
                  :maxlength="loginMethod === 'phone' ? 6 : undefined"
                >
                  <template #prefix>
                    <IconLock />
                  </template>
                  <template v-if="loginMethod === 'phone'" #suffix>
                    <button
                      type="button"
                      class="code-btn"
                      :disabled="!isPhoneValid || countdown > 0"
                      @click="handleSendCode"
                    >
                      {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
                    </button>
                  </template>
                </Input>
                
                <p v-if="loginMethod === 'phone' && codeSent && countdown > 0" class="code-hint">
                  模拟验证码：<strong>123456</strong>
                </p>
                
                <div class="form-row">
                  <a href="#" class="forgot-link" @click.prevent="switchToForgot">忘记密码？</a>
                </div>
                
                <p v-if="errors.submit" class="error-message" role="alert">{{ errors.submit }}</p>
                
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  block
                  :loading="loading"
                >
                  登 录
                </Button>
              </form>
            </div>
            
            <div v-else-if="isRegister" key="register" class="form-content">
              <div class="form-header">
                <h2 class="form-title">创建账号</h2>
                <p class="form-subtitle">注册新账号开始使用</p>
              </div>
              
              <form class="auth-form auth-form-register" @submit.prevent="handleSubmit">
                <Input
                  v-model="loginForm.nickname"
                  label="昵称"
                  placeholder="请输入昵称"
                  :error="errors.nickname"
                  :maxlength="20"
                >
                  <template #prefix>
                    <IconUser />
                  </template>
                </Input>
                
                <Input
                  v-model="loginForm.phone"
                  type="tel"
                  label="手机号"
                  placeholder="请输入手机号"
                  :error="errors.phone"
                  :maxlength="11"
                >
                  <template #prefix>
                    <IconPhone />
                  </template>
                </Input>
                
                <Input
                  v-model="loginForm.code"
                  type="text"
                  label="验证码"
                  placeholder="请输入验证码"
                  :error="errors.code"
                  :maxlength="6"
                >
                  <template #prefix>
                    <IconLock />
                  </template>
                  <template #suffix>
                    <button
                      type="button"
                      class="code-btn"
                      :disabled="!isPhoneValid || countdown > 0"
                      @click="handleSendCode"
                    >
                      {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
                    </button>
                  </template>
                </Input>
                
                <p v-if="codeSent && countdown > 0" class="code-hint">
                  模拟验证码：<strong>123456</strong>
                </p>
                
                <Input
                  v-model="loginForm.password"
                  type="password"
                  label="密码"
                  placeholder="请输入密码（至少6位）"
                  :error="errors.password"
                >
                  <template #prefix>
                    <IconLock />
                  </template>
                </Input>
                
                <Input
                  v-model="loginForm.confirmPassword"
                  type="password"
                  label="确认密码"
                  placeholder="请再次输入密码"
                  :error="errors.confirmPassword"
                >
                  <template #prefix>
                    <IconLock />
                  </template>
                </Input>
                
                <p v-if="errors.submit" class="error-message" role="alert">{{ errors.submit }}</p>
                
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  block
                  :loading="loading"
                >
                  注 册
                </Button>
              </form>
            </div>
            
            <div v-else key="forgot" class="form-content">
              <div class="form-header">
                <h2 class="form-title">重置密码</h2>
                <p class="form-subtitle">通过邮箱验证重置密码</p>
              </div>
              
              <Transition name="fade-slide-up" mode="out-in">
                <div v-if="resetStep === 1" key="step1" class="reset-step">
                  <form class="auth-form" @submit.prevent="handleVerifyCode">
                    <Input
                      v-model="loginForm.email"
                      type="email"
                      label="邮箱"
                      placeholder="请输入邮箱"
                      :error="errors.email"
                    >
                      <template #prefix>
                        <IconUser />
                      </template>
                    </Input>
                    
                    <Input
                      v-model="loginForm.code"
                      type="text"
                      label="验证码"
                      placeholder="请输入验证码"
                      :error="errors.code"
                      :maxlength="6"
                    >
                      <template #prefix>
                        <IconLock />
                      </template>
                      <template #suffix>
                        <button
                          type="button"
                          class="code-btn"
                          :disabled="!isEmailValid || countdown > 0"
                          @click="handleSendCodeForReset"
                        >
                          {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
                        </button>
                      </template>
                    </Input>
                    
                    <p v-if="codeSent && countdown > 0" class="code-hint">
                      模拟验证码：<strong>123456</strong>
                    </p>
                    
                    <p v-if="errors.submit" class="error-message" role="alert">{{ errors.submit }}</p>
                    
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      block
                      :loading="loading"
                    >
                      验证并继续
                    </Button>
                  </form>
                  
                  <div class="form-row-center">
                    <a href="#" class="back-link" @click.prevent="switchToLogin">返回登录</a>
                  </div>
                </div>
                
                <div v-else-if="resetStep === 2" key="step2" class="reset-step">
                  <form class="auth-form" @submit.prevent="handleSubmit">
                    <Input
                      v-model="loginForm.password"
                      type="password"
                      label="新密码"
                      placeholder="请输入新密码（至少6位）"
                      :error="errors.password"
                    >
                      <template #prefix>
                        <IconLock />
                      </template>
                    </Input>
                    
                    <Input
                      v-model="loginForm.confirmPassword"
                      type="password"
                      label="确认密码"
                      placeholder="请再次输入新密码"
                      :error="errors.confirmPassword"
                    >
                      <template #prefix>
                        <IconLock />
                      </template>
                    </Input>
                    
                    <p v-if="errors.submit" class="error-message" role="alert">{{ errors.submit }}</p>
                    
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      block
                      :loading="loading"
                    >
                      确认重置
                    </Button>
                  </form>
                  
                  <div class="form-row-center">
                    <a href="#" class="back-link" @click.prevent="resetStep = 1">上一步</a>
                  </div>
                </div>
                
                <div v-else key="step3" class="reset-step success-content">
                  <div class="success-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M9 12l2 2 4-4"/>
                    </svg>
                  </div>
                  <h3 class="success-title">密码重置成功</h3>
                  <p class="success-text">您的密码已成功重置，请使用新密码登录</p>
                  <Button
                    variant="primary"
                    size="lg"
                    block
                    @click="switchToLogin"
                  >
                    返回登录
                  </Button>
                </div>
              </Transition>
            </div>
          </Transition>
        </div>
      </div>
      
      <div class="overlay-panel">
        <Transition :name="transitionDirection === 'right' ? 'slide-left' : 'slide-right'" mode="out-in">
          <div v-if="isLogin" key="login-overlay" class="overlay-content">
            <h2 class="overlay-title">Hello Friend!</h2>
            <p class="overlay-text">输入您的个人信息，开始您的健康之旅</p>
            <Button
              variant="outline"
              size="lg"
              class="switch-btn switch-btn-light"
              @click="switchToRegister"
            >
              注 册
            </Button>
          </div>
          
          <div v-else-if="isRegister" key="register-overlay" class="overlay-content">
            <h2 class="overlay-title">Welcome Back!</h2>
            <p class="overlay-text">已有账号？立即登录继续您的健康咨询</p>
            <Button
              variant="outline"
              size="lg"
              class="switch-btn switch-btn-light"
              @click="switchToLogin"
            >
              登 录
            </Button>
          </div>
          
          <div v-else key="forgot-overlay" class="overlay-content">
            <h2 class="overlay-title">Remember Password?</h2>
            <p class="overlay-text">返回登录页面继续使用</p>
            <Button
              variant="outline"
              size="lg"
              class="switch-btn switch-btn-light"
              @click="switchToLogin"
            >
              登 录
            </Button>
          </div>
        </Transition>
      </div>
    </div>
    
    <p class="auth-disclaimer">
      <span>登录即表示您同意我们的</span>
      <a href="#">服务条款</a>
      <span>和</span>
      <a href="#">隐私政策</a>
    </p>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--spacing-4);
  background: linear-gradient(-45deg, #0EA5E9 0%, #7DD3FC 50%, #E0F2FE 100%);
  position: relative;
  overflow: hidden;
}

.auth-page::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #CFFAFE 0%, #22D3EE 50%, #06B6D4 100%);
  opacity: 0;
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 0;
}

.auth-page.is-register-bg::before {
  opacity: 1;
}

.auth-page > * {
  position: relative;
  z-index: 1;
}

.dark .auth-page {
  background: linear-gradient(-45deg, #0F172A 0%, #1E3A5F 50%, #0F172A 100%);
}

.dark .auth-page::before {
  background: linear-gradient(135deg, #0F172A 0%, #164E63 50%, #0F172A 100%);
}

.auth-container {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 850px;
  min-height: 560px;
  background-color: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
}

.form-card {
  position: absolute;
  top: 0;
  left: 0;
  width: 65%;
  height: 100%;
  background-color: var(--color-surface);
  z-index: 2;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow-y: auto;
}

.auth-container.is-register .form-card {
  transform: translateX(53.8%);
}

.form-card-inner {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100%;
  padding: var(--spacing-8) var(--spacing-10);
}

.overlay-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 35%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-8);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: var(--color-text-inverse);
  z-index: 1;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.auth-container.is-register .overlay-panel {
  transform: translateX(-186%);
}

.form-content {
  width: 100%;
  max-width: 340px;
}

.form-header {
  text-align: center;
  margin-bottom: var(--spacing-6);
}

.form-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-2) 0;
}

.form-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.login-method-tabs {
  display: flex;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-5);
  padding: var(--spacing-1);
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-lg);
  position: relative;
}

.tab-indicator {
  position: absolute;
  top: var(--spacing-1);
  left: var(--spacing-1);
  width: calc(50% - var(--spacing-2));
  height: calc(100% - var(--spacing-2));
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 0;
}

.tab-indicator-right {
  transform: translateX(100%);
}

.method-tab {
  flex: 1;
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  transition: color 0.2s ease;
  position: relative;
  z-index: 1;
}

.method-tab.active {
  color: var(--color-primary);
}

.method-tab:hover:not(.active) {
  color: var(--color-text-primary);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.auth-form-register {
  gap: var(--spacing-3);
}

.form-row {
  display: flex;
  justify-content: flex-end;
  margin-top: calc(var(--spacing-1) * -1);
}

.form-row-center {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-4);
}

.forgot-link {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  transition: color var(--transition-fast);
}

.forgot-link:hover {
  color: var(--color-primary);
}

.back-link {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  transition: color var(--transition-fast);
}

.back-link:hover {
  color: var(--color-primary);
}

.reset-step {
  width: 100%;
}

.success-content {
  text-align: center;
  padding: var(--spacing-4) 0;
}

.success-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--spacing-4);
  color: var(--color-success);
}

.success-icon svg {
  width: 100%;
  height: 100%;
}

.success-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-2) 0;
}

.success-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-5) 0;
}

.code-btn {
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  white-space: nowrap;
  padding: 0 var(--spacing-2);
  font-weight: var(--font-weight-medium);
}

.code-btn:disabled {
  color: var(--color-text-tertiary);
  cursor: not-allowed;
}

.code-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: calc(var(--spacing-1) * -1) 0 0 0;
}

.error-message {
  font-size: var(--font-size-sm);
  color: var(--color-error);
  margin: 0;
  text-align: center;
}

.overlay-content {
  text-align: center;
}

.overlay-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  margin: 0 0 var(--spacing-3) 0;
}

.overlay-text {
  font-size: var(--font-size-sm);
  opacity: 0.9;
  margin: 0 0 var(--spacing-5) 0;
  line-height: 1.6;
}

.switch-btn {
  min-width: 100px;
}

.switch-btn-light {
  border-color: rgba(255, 255, 255, 0.5);
  color: var(--color-text-inverse);
}

.switch-btn-light:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.8);
}

.auth-disclaimer {
  margin-top: var(--spacing-6);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  text-align: center;
}

.auth-disclaimer a {
  color: var(--color-primary);
  text-decoration: none;
}

.auth-disclaimer a:hover {
  text-decoration: underline;
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(40px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(-40px);
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(-40px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(40px);
}

.fade-slide-up-enter-active,
.fade-slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-slide-up-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

@media (max-width: 767px) {
  .auth-container {
    flex-direction: column;
    max-width: 400px;
    min-height: auto;
  }

  .form-card {
    position: relative;
    width: 100%;
    height: auto;
    min-height: auto;
  }

  .auth-container.is-register .form-card {
    transform: none;
    order: 2;
  }

  .form-card-inner {
    padding: var(--spacing-6);
  }

  .overlay-panel {
    position: relative;
    width: 100%;
    right: auto;
    left: auto;
    order: 1;
    padding: var(--spacing-6);
  }

  .auth-container.is-register .overlay-panel {
    left: auto;
    order: 3;
    transform: none;
  }

  .overlay-title {
    font-size: var(--font-size-lg);
  }

  .overlay-text {
    margin-bottom: var(--spacing-4);
  }

  .auth-form-register {
    gap: var(--spacing-3);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-container,
  .form-card,
  .overlay-panel,
  .tab-indicator {
    transition: none;
  }
}
</style>
