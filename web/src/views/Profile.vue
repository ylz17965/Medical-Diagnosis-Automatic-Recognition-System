<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { MainLayout } from '@/layouts'
import { Button, Input, Toggle, Modal } from '@/components/base'
import IconUser from '@/components/icons/IconUser.vue'
import IconSettings from '@/components/icons/IconSettings.vue'
import IconSun from '@/components/icons/IconSun.vue'
import IconMoon from '@/components/icons/IconMoon.vue'
import IconLock from '@/components/icons/IconLock.vue'
import { useUserStore, useSettingsStore } from '@/stores'
import { userApi, authApi } from '@/services/api'
import {
  usePasswordModal,
  useAvatarModal,
  useDeleteAccountModal,
  usePolicyModal,
  useProfileNav
} from '@/composables'

const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()

const sections = [
  { key: 'profile', label: '个人信息', icon: IconUser },
  { key: 'account', label: '账号设置', icon: IconSettings },
  { key: 'apikeys', label: '模型配置', icon: IconSettings }
]

const { activeSection, setActive, isActive } = useProfileNav(sections)
const passwordModal = usePasswordModal()
const avatarModal = useAvatarModal()
const deleteAccountModal = useDeleteAccountModal()
const policyModal = usePolicyModal()

const isEditing = ref(false)
const editForm = ref({
  nickname: '',
  email: ''
})
const editLoading = ref(false)
const avatarFileInput = ref<HTMLInputElement | null>(null)

const showApiKey = ref(false)
const apiForm = ref({
  apiKey: settingsStore.settings.apiKeys.qwen.apiKey,
  baseUrl: settingsStore.settings.apiKeys.qwen.baseUrl,
  complexModel: settingsStore.settings.apiKeys.qwen.complexModel,
  simpleModel: settingsStore.settings.apiKeys.qwen.simpleModel,
  visionModel: settingsStore.settings.apiKeys.qwen.visionModel,
  embeddingModel: settingsStore.settings.apiKeys.qwen.embeddingModel,
})
const apiTestLoading = ref(false)
const apiTestResult = ref<{ success: boolean; message: string } | null>(null)

const saveApiKeys = () => {
  settingsStore.updateApiKeys({
    useCustomKey: true,
    qwen: { ...apiForm.value }
  })
  settingsStore.setUseCustomKey(true)
}

const clearApiKeys = () => {
  apiForm.value = {
    apiKey: '',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    complexModel: 'qwen-max',
    simpleModel: 'qwen3.5-flash',
    visionModel: 'qwen3-vl-plus',
    embeddingModel: 'text-embedding-v3',
  }
  settingsStore.setUseCustomKey(false)
  settingsStore.updateApiKeys({
    useCustomKey: false,
    qwen: { ...apiForm.value }
  })
}

const testApiKey = async () => {
  if (!apiForm.value.apiKey) {
    apiTestResult.value = { success: false, message: '请先输入 API Key' }
    return
  }
  apiTestLoading.value = true
  apiTestResult.value = null
  try {
    const response = await fetch(`${apiForm.value.baseUrl}/models`, {
      headers: { 'Authorization': `Bearer ${apiForm.value.apiKey}` },
    })
    if (response.ok) {
      apiTestResult.value = { success: true, message: '连接成功！API Key 有效' }
    } else {
      const data = await response.json().catch(() => ({}))
      apiTestResult.value = { success: false, message: `连接失败：${data.error?.message || response.statusText}` }
    }
  } catch (error) {
    apiTestResult.value = { success: false, message: `网络错误：${error instanceof Error ? error.message : '无法连接'}` }
  } finally {
    apiTestLoading.value = false
  }
}

const startEdit = () => {
  editForm.value = {
    nickname: userStore.user?.nickname || '',
    email: userStore.user?.email || ''
  }
  isEditing.value = true
}

const saveEdit = async () => {
  editLoading.value = true
  try {
    const result = await userApi.updateProfile(editForm.value)
    if (result.success && result.data) {
      userStore.updateUser(result.data)
    } else {
      userStore.updateUser(editForm.value)
    }
    isEditing.value = false
  } finally {
    editLoading.value = false
  }
}

const cancelEdit = () => {
  isEditing.value = false
}

const handleAvatarFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  await avatarModal.uploadAvatar(file, (avatarUrl) => {
    userStore.updateUser({ avatar: avatarUrl })
  })

  input.value = ''
}

const triggerAvatarUpload = () => {
  avatarFileInput.value?.click()
}

const handleDeleteAccount = async () => {
  await deleteAccountModal.confirm(() => {})
}

const handleLogout = async () => {
  try {
    await authApi.logout()
  } finally {
    userStore.logout()
    router.push('/login')
  }
}
</script>

<template>
  <MainLayout>
    <div class="profile-page">
      <header class="page-header">
        <h1 class="page-title">个人中心</h1>
      </header>
      
      <div class="profile-content">
        <nav class="profile-nav" aria-label="设置导航">
          <button
            v-for="section in sections"
            :key="section.key"
            :class="['nav-item', { active: isActive(section.key) }]"
            :aria-current="isActive(section.key) ? 'page' : undefined"
            @click="setActive(section.key)"
          >
            <component :is="section.icon" class="nav-icon" aria-hidden="true" />
            <span>{{ section.label }}</span>
          </button>
        </nav>
        
        <main class="profile-main">
          <Transition name="fade" mode="out-in">
            <section v-if="activeSection === 'profile'" key="profile" class="section-content" aria-labelledby="profile-title">
              <h2 id="profile-title" class="sr-only">个人信息</h2>
              <div class="profile-card">
                <div class="avatar-section">
                  <div class="avatar" role="img" :aria-label="userStore.user?.nickname || '用户头像'">
                    <img v-if="userStore.user?.avatar" :src="userStore.user.avatar" alt="" />
                    <span v-else aria-hidden="true">{{ userStore.user?.nickname?.charAt(0) || 'U' }}</span>
                  </div>
                  <Button variant="secondary" size="sm" @click="avatarModal.open">更换头像</Button>
                </div>
                
                <div class="info-section">
                  <Transition name="fade" mode="out-in">
                    <div v-if="!isEditing" key="display" class="info-display">
                      <div class="info-item">
                        <label>昵称</label>
                        <span>{{ userStore.user?.nickname || '未设置' }}</span>
                      </div>
                      <div class="info-item">
                        <label>手机号</label>
                        <span>{{ userStore.user?.phone || '未绑定' }}</span>
                      </div>
                      <div class="info-item">
                        <label>邮箱</label>
                        <span>{{ userStore.user?.email || '未设置' }}</span>
                      </div>
                      <Button variant="primary" @click="startEdit">编辑资料</Button>
                    </div>
                    
                    <form v-else key="edit" class="info-edit" @submit.prevent="saveEdit">
                      <Input v-model="editForm.nickname" label="昵称" placeholder="请输入昵称" required />
                      <Input v-model="editForm.email" type="email" label="邮箱" placeholder="请输入邮箱" />
                      <div class="edit-actions">
                        <Button type="button" variant="secondary" @click="cancelEdit">取消</Button>
                        <Button type="submit" variant="primary" :loading="editLoading">保存</Button>
                      </div>
                    </form>
                  </Transition>
                </div>
              </div>
            </section>
            
            <section v-else-if="activeSection === 'account'" key="account" class="section-content" aria-labelledby="account-title">
              <h2 id="account-title" class="sr-only">账号设置</h2>
              <div class="settings-card">
                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">推送通知</span>
                    <span class="setting-desc">接收健康提醒和系统通知</span>
                  </div>
                  <Toggle v-model="settingsStore.settings.notifications" aria-label="推送通知" />
                </div>
                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">声音提醒</span>
                    <span class="setting-desc">收到消息时播放提示音</span>
                  </div>
                  <Toggle v-model="settingsStore.settings.soundEnabled" aria-label="声音提醒" />
                </div>
                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">主题模式</span>
                  </div>
                  <div class="theme-options" role="radiogroup" aria-label="主题模式选择">
                    <button
                      :class="['theme-btn', { active: settingsStore.settings.theme === 'light' }]"
                      :aria-checked="settingsStore.settings.theme === 'light'"
                      role="radio"
                      @click="settingsStore.setTheme('light')"
                    >
                      <IconSun aria-hidden="true" />
                      <span>浅色</span>
                    </button>
                    <button
                      :class="['theme-btn', { active: settingsStore.settings.theme === 'dark' }]"
                      :aria-checked="settingsStore.settings.theme === 'dark'"
                      role="radio"
                      @click="settingsStore.setTheme('dark')"
                    >
                      <IconMoon aria-hidden="true" />
                      <span>深色</span>
                    </button>
                    <button
                      :class="['theme-btn', { active: settingsStore.settings.theme === 'system' }]"
                      :aria-checked="settingsStore.settings.theme === 'system'"
                      role="radio"
                      @click="settingsStore.setTheme('system')"
                    >
                      <IconSun aria-hidden="true" />
                      <span>跟随系统</span>
                    </button>
                  </div>
                </div>
                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">修改密码</span>
                    <span class="setting-desc">定期修改密码可以保护账号安全</span>
                  </div>
                  <Button variant="secondary" size="sm" @click="passwordModal.open">修改</Button>
                </div>
                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">隐私政策</span>
                  </div>
                  <Button variant="text" size="sm" @click="policyModal.open('privacy')">查看</Button>
                </div>
                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">用户协议</span>
                  </div>
                  <Button variant="text" size="sm" @click="policyModal.open('terms')">查看</Button>
                </div>
              </div>
              
              <div class="danger-zone">
                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label danger">退出登录</span>
                    <span class="setting-desc">退出当前账号</span>
                  </div>
                  <Button variant="secondary" size="sm" @click="handleLogout">退出</Button>
                </div>
                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label danger">注销账号</span>
                    <span class="setting-desc">注销后数据将无法恢复</span>
                  </div>
                  <Button variant="secondary" size="sm" @click="deleteAccountModal.open">注销</Button>
                </div>
              </div>
            </section>
            
            <section v-else-if="activeSection === 'apikeys'" key="apikeys" class="section-content" aria-labelledby="apikeys-title">
              <h2 id="apikeys-title" class="sr-only">模型配置</h2>
              <div class="settings-card">
                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">使用自定义 API Key</span>
                    <span class="setting-desc">开启后将使用您自己的 API Key，而非服务器默认配置</span>
                  </div>
                  <Toggle v-model="settingsStore.settings.apiKeys.useCustomKey" aria-label="使用自定义API Key" @update:model-value="settingsStore.setUseCustomKey($event)" />
                </div>

                <div v-if="settingsStore.settings.apiKeys.useCustomKey" class="api-config-section">
                  <div class="api-provider-card">
                    <div class="provider-header">
                      <span class="provider-name">🤖 通义千问 (Qwen)</span>
                      <a href="https://bailian.console.aliyun.com/" target="_blank" rel="noopener" class="provider-link">获取 API Key →</a>
                    </div>

                    <div class="form-group">
                      <label class="form-label">API Key</label>
                      <div class="api-key-input">
                        <input
                          :type="showApiKey ? 'text' : 'password'"
                          v-model="apiForm.apiKey"
                          class="form-input"
                          placeholder="sk-xxxxxxxxxxxxxxxx"
                        />
                        <button class="toggle-visibility" @click="showApiKey = !showApiKey" :aria-label="showApiKey ? '隐藏' : '显示'">
                          {{ showApiKey ? '隐藏' : '显示' }}
                        </button>
                      </div>
                    </div>

                    <div class="form-group">
                      <label class="form-label">API Base URL</label>
                      <input v-model="apiForm.baseUrl" type="text" class="form-input" placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1" />
                    </div>

                    <div class="model-config-grid">
                      <div class="form-group">
                        <label class="form-label">深度分析模型</label>
                        <input v-model="apiForm.complexModel" type="text" class="form-input" placeholder="qwen-max" />
                        <span class="form-hint">用于复杂诊断、病理分析</span>
                      </div>
                      <div class="form-group">
                        <label class="form-label">快速回答模型</label>
                        <input v-model="apiForm.simpleModel" type="text" class="form-input" placeholder="qwen3.5-flash" />
                        <span class="form-hint">用于简单问答、快速咨询</span>
                      </div>
                      <div class="form-group">
                        <label class="form-label">视觉模型</label>
                        <input v-model="apiForm.visionModel" type="text" class="form-input" placeholder="qwen3-vl-plus" />
                        <span class="form-hint">用于图片识别、报告解读</span>
                      </div>
                      <div class="form-group">
                        <label class="form-label">嵌入模型</label>
                        <input v-model="apiForm.embeddingModel" type="text" class="form-input" placeholder="text-embedding-v3" />
                        <span class="form-hint">用于知识库向量检索</span>
                      </div>
                    </div>

                    <div v-if="apiTestResult" :class="['test-result', apiTestResult.success ? 'success' : 'error']">
                      {{ apiTestResult.message }}
                    </div>

                    <div class="api-actions">
                      <Button variant="secondary" size="sm" @click="testApiKey" :loading="apiTestLoading">测试连接</Button>
                      <Button variant="primary" size="sm" @click="saveApiKeys">保存配置</Button>
                      <Button variant="secondary" size="sm" @click="clearApiKeys">清除配置</Button>
                    </div>
                  </div>
                </div>

                <div v-else class="api-default-hint">
                  <p>当前使用服务器默认 API Key 配置。如需使用自己的 Key，请开启上方开关。</p>
                  <p class="hint-sub">使用自己的 API Key 可以：避免共享额度限制、自定义模型选择、使用其他兼容 OpenAI 接口的服务</p>
                </div>
              </div>
            </section>
          </Transition>
        </main>
      </div>
    </div>
    
    <Modal v-model="passwordModal.showModal.value" title="修改密码" :loading="passwordModal.loading.value">
      <form v-if="!passwordModal.success.value" @submit.prevent="passwordModal.submit()">
        <div class="form-group">
          <Input v-model="passwordModal.form.value.currentPassword" type="password" label="当前密码" placeholder="请输入当前密码" :error="passwordModal.errors.value.currentPassword" required>
            <template #prefix><IconLock /></template>
          </Input>
        </div>
        <div class="form-group">
          <Input v-model="passwordModal.form.value.newPassword" type="password" label="新密码" placeholder="请输入新密码（至少8位）" :error="passwordModal.errors.value.newPassword" required>
            <template #prefix><IconLock /></template>
          </Input>
        </div>
        <div class="form-group">
          <Input v-model="passwordModal.form.value.confirmPassword" type="password" label="确认密码" placeholder="请再次输入新密码" :error="passwordModal.errors.value.confirmPassword" required>
            <template #prefix><IconLock /></template>
          </Input>
        </div>
        <p v-if="passwordModal.errors.value.submit" class="error-message" role="alert">{{ passwordModal.errors.value.submit }}</p>
        <div class="modal-actions">
          <Button type="button" variant="secondary" @click="passwordModal.close">取消</Button>
          <Button type="submit" variant="primary" :loading="passwordModal.loading.value">确认修改</Button>
        </div>
      </form>
      <div v-else class="success-content" role="status">
        <div class="success-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg></div>
        <h4 class="success-title">密码修改成功</h4>
        <p class="success-text">您的密码已成功修改</p>
      </div>
    </Modal>
    
    <Modal v-model="avatarModal.showModal.value" title="更换头像" :loading="avatarModal.loading.value">
      <div class="avatar-preview">
        <div class="avatar-large" role="img" :aria-label="userStore.user?.nickname || '用户头像'">
          <img v-if="userStore.user?.avatar" :src="userStore.user.avatar" alt="" />
          <span v-else aria-hidden="true">{{ userStore.user?.nickname?.charAt(0) || 'U' }}</span>
        </div>
      </div>
      <p class="avatar-hint">选择一张图片作为您的新头像</p>
      <p v-if="avatarModal.error.value" class="error-message" role="alert">{{ avatarModal.error.value }}</p>
      <input ref="avatarFileInput" type="file" accept="image/*" style="display: none" @change="handleAvatarFileSelect" />
      <div class="modal-actions">
        <Button variant="secondary" @click="avatarModal.close">取消</Button>
        <Button variant="primary" :loading="avatarModal.loading.value" @click="triggerAvatarUpload">选择图片</Button>
      </div>
    </Modal>
    
    <Modal v-model="policyModal.showModal.value" :title="policyModal.title.value" size="lg">
      <div class="policy-content">
        <div v-if="policyModal.policyType.value === 'privacy'">
          <h4>隐私政策</h4>
          <p>我们重视您的隐私保护。本隐私政策说明我们如何收集、使用和保护您的个人信息。</p>
          <h5>1. 信息收集</h5>
          <p>我们收集您在使用服务时提供的个人信息，包括但不限于：姓名、联系方式、健康信息等。</p>
          <h5>2. 信息使用</h5>
          <p>我们使用收集的信息来提供、维护和改进我们的服务，以及与您沟通。</p>
          <h5>3. 信息保护</h5>
          <p>我们采取适当的安全措施保护您的个人信息，防止未经授权的访问、使用或泄露。</p>
        </div>
        <div v-else>
          <h4>用户协议</h4>
          <p>欢迎使用智疗助手。使用本服务即表示您同意以下条款。</p>
          <h5>1. 服务内容</h5>
          <p>智疗助手提供健康咨询、体检报告解读等服务，仅供参考，不构成医疗建议。</p>
          <h5>2. 用户责任</h5>
          <p>您应提供真实、准确的信息，并对您的账户安全负责。</p>
          <h5>3. 免责声明</h5>
          <p>本服务提供的健康信息仅供参考，不能替代专业医疗诊断和治疗。</p>
        </div>
        <div class="modal-actions">
          <Button variant="primary" @click="policyModal.close">我已了解</Button>
        </div>
      </div>
    </Modal>
    
    <Modal v-model="deleteAccountModal.showModal.value" title="注销账号" danger>
      <div class="warning-box" role="alert">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <div>
          <h4>警告：此操作不可逆</h4>
          <p>注销账号后，您的所有数据将被永久删除且无法恢复。</p>
        </div>
      </div>
      <div class="form-group">
        <Input v-model="deleteAccountModal.confirmText.value" label="确认输入" placeholder="请输入「确认注销」以继续" required />
      </div>
      <p v-if="deleteAccountModal.error.value" class="error-message" role="alert">{{ deleteAccountModal.error.value }}</p>
      <div class="modal-actions">
        <Button variant="secondary" @click="deleteAccountModal.close">取消</Button>
        <Button variant="primary" :loading="deleteAccountModal.loading.value" :disabled="!deleteAccountModal.isValid.value" @click="handleDeleteAccount">确认注销</Button>
      </div>
    </Modal>
  </MainLayout>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-fast);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.profile-page {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.page-header {
  margin-bottom: var(--spacing-6);
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
}

.profile-content {
  display: flex;
  gap: var(--spacing-6);
  flex: 1;
  min-height: 0;
}

.profile-nav {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  width: 180px;
  flex-shrink: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
  text-align: left;
}

.nav-item:hover {
  background-color: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.nav-item:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.nav-item.active {
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}

.nav-icon {
  width: 18px;
  height: 18px;
}

.profile-main {
  flex: 1;
  min-width: 0;
}

.section-content {
  background-color: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  box-shadow: var(--shadow-sm);
}

.profile-card {
  display: flex;
  gap: var(--spacing-8);
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
}

.avatar {
  width: 80px;
  height: 80px;
  background-color: var(--color-primary-bg);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info-section {
  flex: 1;
}

.info-display {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.info-item label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.info-item span {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
}

.info-edit {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.edit-actions {
  display: flex;
  gap: var(--spacing-3);
  margin-top: var(--spacing-2);
}

.settings-card {
  margin-bottom: var(--spacing-6);
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4) 0;
  border-bottom: 1px solid var(--color-border-light);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.setting-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.setting-label.danger {
  color: var(--color-error);
}

.setting-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.theme-options {
  display: flex;
  gap: var(--spacing-2);
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-2) var(--spacing-3);
  background-color: var(--color-bg-tertiary);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.theme-btn:hover {
  background-color: var(--color-surface-hover);
}

.theme-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.theme-btn.active {
  border-color: var(--color-primary);
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
}

.theme-btn svg {
  width: 16px;
  height: 16px;
}

.danger-zone {
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-4);
}

.api-config-section {
  margin-top: var(--spacing-4);
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--color-border);
}

.api-provider-card {
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-xl);
  padding: var(--spacing-5);
}

.provider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-4);
}

.provider-name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.provider-link {
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  text-decoration: none;
}

.provider-link:hover {
  text-decoration: underline;
}

.api-key-input {
  position: relative;
  display: flex;
  align-items: center;
}

.api-key-input .form-input {
  flex: 1;
  padding-right: 60px;
}

.toggle-visibility {
  position: absolute;
  right: var(--spacing-2);
  padding: var(--spacing-1) var(--spacing-2);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  border-radius: var(--radius-sm);
}

.toggle-visibility:hover {
  color: var(--color-primary);
  background-color: var(--color-primary-bg);
}

.form-input {
  width: 100%;
  padding: var(--spacing-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  transition: border-color var(--transition-fast);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-input::placeholder {
  color: var(--color-text-quaternary);
}

.form-label {
  display: block;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-1);
}

.form-hint {
  display: block;
  font-size: 11px;
  color: var(--color-text-quaternary);
  margin-top: 2px;
}

.model-config-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-3);
  margin-top: var(--spacing-3);
}

.test-result {
  margin-top: var(--spacing-3);
  padding: var(--spacing-3);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}

.test-result.success {
  background-color: var(--color-success-bg);
  color: var(--color-success);
}

.test-result.error {
  background-color: var(--color-error-bg);
  color: var(--color-error);
}

.api-actions {
  display: flex;
  gap: var(--spacing-3);
  margin-top: var(--spacing-4);
}

.api-default-hint {
  margin-top: var(--spacing-4);
  padding: var(--spacing-4);
  background-color: var(--color-fill-tertiary);
  border-radius: var(--radius-lg);
}

.api-default-hint p {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.api-default-hint .hint-sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--spacing-2);
}

.form-group {
  margin-bottom: var(--spacing-4);
}

.modal-actions {
  display: flex;
  gap: var(--spacing-3);
  margin-top: var(--spacing-5);
}

.modal-actions > * {
  flex: 1;
}

.success-content {
  text-align: center;
  padding: var(--spacing-6) 0;
}

.success-icon {
  width: 56px;
  height: 56px;
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
  margin: 0;
}

.error-message {
  font-size: var(--font-size-sm);
  color: var(--color-error);
  margin: 0;
  text-align: center;
}

.avatar-preview {
  display: flex;
  justify-content: center;
  margin-bottom: var(--spacing-4);
}

.avatar-large {
  width: 100px;
  height: 100px;
  border-radius: var(--radius-full);
  background-color: var(--color-primary-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  overflow: hidden;
}

.avatar-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-hint {
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-4) 0;
}

.policy-content {
  max-height: 400px;
  overflow-y: auto;
}

.policy-content h4 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-3) 0;
}

.policy-content h5 {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin: var(--spacing-4) 0 var(--spacing-2) 0;
}

.policy-content p {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-2) 0;
  line-height: 1.6;
}

.warning-box {
  display: flex;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  background-color: var(--color-error-bg);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-4);
}

.warning-box svg {
  width: 24px;
  height: 24px;
  color: var(--color-error);
  flex-shrink: 0;
}

.warning-box h4 {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-error);
  margin: 0 0 var(--spacing-1) 0;
}

.warning-box p {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

@media (max-width: 767px) {
  .profile-content {
    flex-direction: column;
  }

  .profile-nav {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: var(--spacing-2);
  }

  .nav-item {
    white-space: nowrap;
  }

  .profile-card {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
}
</style>
