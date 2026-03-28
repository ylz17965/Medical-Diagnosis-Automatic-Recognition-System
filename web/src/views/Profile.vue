<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { MainLayout } from '@/layouts'
import { Button, Input, Toggle, Modal } from '@/components/base'
import IconUser from '@/components/icons/IconUser.vue'
import IconBell from '@/components/icons/IconBell.vue'
import IconShield from '@/components/icons/IconShield.vue'
import IconSun from '@/components/icons/IconSun.vue'
import IconMoon from '@/components/icons/IconMoon.vue'
import IconLock from '@/components/icons/IconLock.vue'
import { useUserStore, useSettingsStore } from '@/stores'
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
  { key: 'notifications', label: '通知设置', icon: IconBell },
  { key: 'privacy', label: '隐私安全', icon: IconShield },
  { key: 'appearance', label: '外观设置', icon: IconSun }
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

const startEdit = () => {
  editForm.value = {
    nickname: userStore.user?.nickname || '',
    email: userStore.user?.email || ''
  }
  isEditing.value = true
}

const saveEdit = () => {
  userStore.updateUser(editForm.value)
  isEditing.value = false
}

const cancelEdit = () => {
  isEditing.value = false
}

const handleAvatarChange = async () => {
  await avatarModal.changeAvatar((avatarUrl) => {
    userStore.updateUser({ avatar: avatarUrl })
  })
}

const handleDeleteAccount = async () => {
  await deleteAccountModal.confirm(() => {
    userStore.logout()
    router.push('/login')
  })
}

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
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
          <Transition name="section-fade" mode="out-in">
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
                  <Transition name="info-fade" mode="out-in">
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
                      <Input
                        v-model="editForm.nickname"
                        label="昵称"
                        placeholder="请输入昵称"
                        required
                      />
                      <Input
                        v-model="editForm.email"
                        type="email"
                        label="邮箱"
                        placeholder="请输入邮箱"
                      />
                      <div class="edit-actions">
                        <Button type="button" variant="secondary" @click="cancelEdit">取消</Button>
                        <Button type="submit" variant="primary">保存</Button>
                      </div>
                    </form>
                  </Transition>
                </div>
              </div>
              
              <div class="health-records">
                <h3 class="section-title">健康档案</h3>
                <div class="records-placeholder" role="status">
                  <p>健康档案功能即将上线</p>
                  <p class="hint">您可以在这里管理您的健康信息</p>
                </div>
              </div>
            </section>
            
            <section v-else-if="activeSection === 'notifications'" key="notifications" class="section-content" aria-labelledby="notifications-title">
              <h2 id="notifications-title" class="sr-only">通知设置</h2>
              <div class="settings-card">
                <h3 class="card-title">通知设置</h3>
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
              </div>
            </section>
            
            <section v-else-if="activeSection === 'privacy'" key="privacy" class="section-content" aria-labelledby="privacy-title">
              <h2 id="privacy-title" class="sr-only">隐私安全</h2>
              <div class="settings-card">
                <h3 class="card-title">隐私安全</h3>
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
                    <span class="setting-desc">查看我们的隐私政策</span>
                  </div>
                  <Button variant="text" size="sm" @click="policyModal.open('privacy')">查看</Button>
                </div>
                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">用户协议</span>
                    <span class="setting-desc">查看用户服务协议</span>
                  </div>
                  <Button variant="text" size="sm" @click="policyModal.open('terms')">查看</Button>
                </div>
              </div>
              
              <div class="danger-zone">
                <h3 class="card-title danger">危险操作</h3>
                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">退出登录</span>
                    <span class="setting-desc">退出当前账号</span>
                  </div>
                  <Button variant="secondary" size="sm" @click="handleLogout">退出</Button>
                </div>
                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">注销账号</span>
                    <span class="setting-desc">注销后数据将无法恢复</span>
                  </div>
                  <Button variant="secondary" size="sm" @click="deleteAccountModal.open">注销</Button>
                </div>
              </div>
            </section>
            
            <section v-else-if="activeSection === 'appearance'" key="appearance" class="section-content" aria-labelledby="appearance-title">
              <h2 id="appearance-title" class="sr-only">外观设置</h2>
              <div class="settings-card">
                <h3 class="card-title">外观设置</h3>
                <div class="setting-item">
                  <div class="setting-info">
                    <span class="setting-label">主题模式</span>
                    <span class="setting-desc">选择您喜欢的主题</span>
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
                    <span class="setting-label">字体大小</span>
                    <span class="setting-desc">调整界面字体大小</span>
                  </div>
                  <div class="font-size-options" role="radiogroup" aria-label="字体大小选择">
                    <button
                      v-for="size in ['small', 'medium', 'large']"
                      :key="size"
                      :class="['size-btn', { active: settingsStore.settings.fontSize === size }]"
                      :aria-checked="settingsStore.settings.fontSize === size"
                      role="radio"
                      @click="settingsStore.updateSettings({ fontSize: size as any })"
                    >
                      {{ size === 'small' ? '小' : size === 'medium' ? '中' : '大' }}
                    </button>
                  </div>
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
          <Input
            v-model="passwordModal.form.value.currentPassword"
            type="password"
            label="当前密码"
            placeholder="请输入当前密码"
            :error="passwordModal.errors.value.currentPassword"
            required
          >
            <template #prefix>
              <IconLock />
            </template>
          </Input>
        </div>
        
        <div class="form-group">
          <Input
            v-model="passwordModal.form.value.newPassword"
            type="password"
            label="新密码"
            placeholder="请输入新密码（至少6位）"
            :error="passwordModal.errors.value.newPassword"
            required
          >
            <template #prefix>
              <IconLock />
            </template>
          </Input>
        </div>
        
        <div class="form-group">
          <Input
            v-model="passwordModal.form.value.confirmPassword"
            type="password"
            label="确认密码"
            placeholder="请再次输入新密码"
            :error="passwordModal.errors.value.confirmPassword"
            required
          >
            <template #prefix>
              <IconLock />
            </template>
          </Input>
        </div>
        
        <p v-if="passwordModal.errors.value.submit" class="error-message" role="alert">
          {{ passwordModal.errors.value.submit }}
        </p>
        
        <div class="modal-actions">
          <Button type="button" variant="secondary" @click="passwordModal.close">取消</Button>
          <Button type="submit" variant="primary" :loading="passwordModal.loading.value">确认修改</Button>
        </div>
      </form>
      
      <div v-else class="success-content" role="status">
        <div class="success-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
        </div>
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
      <p class="avatar-hint">点击下方按钮随机生成新头像</p>
      
      <div class="modal-actions">
        <Button variant="secondary" @click="avatarModal.close">取消</Button>
        <Button variant="primary" :loading="avatarModal.loading.value" @click="handleAvatarChange">更换头像</Button>
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
    
    <Modal
      v-model="deleteAccountModal.showModal.value"
      title="注销账号"
      danger
    >
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
        <Input
          v-model="deleteAccountModal.confirmText.value"
          label="确认输入"
          placeholder="请输入「确认注销」以继续"
          required
        />
      </div>
      
      <div class="modal-actions">
        <Button variant="secondary" @click="deleteAccountModal.close">取消</Button>
        <Button 
          variant="primary" 
          :loading="deleteAccountModal.loading.value" 
          :disabled="!deleteAccountModal.isValid.value"
          @click="handleDeleteAccount"
        >
          确认注销
        </Button>
      </div>
    </Modal>
  </MainLayout>
</template>

<style scoped>
.section-fade-enter-active {
  transition: opacity 0.25s ease-out, transform 0.25s ease-out;
}

.section-fade-leave-active {
  transition: opacity 0.2s ease-in, transform 0.2s ease-in;
}

.section-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.section-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.info-fade-enter-active {
  transition: opacity 0.25s ease-out, transform 0.25s ease-out;
}

.info-fade-leave-active {
  transition: opacity 0.2s ease-in, transform 0.2s ease-in;
}

.info-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.info-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
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
  width: 200px;
  flex-shrink: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-base);
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
  width: 20px;
  height: 20px;
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
  margin-bottom: var(--spacing-8);
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
}

.avatar {
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-inverse);
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
  font-size: var(--font-size-sm);
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

.health-records {
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-6);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-4) 0;
}

.records-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-8);
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-lg);
  text-align: center;
}

.records-placeholder p {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  margin: 0;
}

.records-placeholder .hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-top: var(--spacing-2);
}

.settings-card {
  margin-bottom: var(--spacing-6);
}

.card-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-4) 0;
}

.card-title.danger {
  color: var(--color-error);
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
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.setting-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.theme-options {
  display: flex;
  gap: var(--spacing-2);
}

.theme-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-3) var(--spacing-4);
  background-color: var(--color-bg-tertiary);
  border: 2px solid transparent;
  border-radius: var(--radius-lg);
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
}

.theme-btn svg {
  width: 20px;
  height: 20px;
  color: var(--color-text-secondary);
}

.theme-btn.active svg {
  color: var(--color-primary);
}

.theme-btn span {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.theme-btn.active span {
  color: var(--color-primary);
}

.font-size-options {
  display: flex;
  gap: var(--spacing-2);
}

.size-btn {
  padding: var(--spacing-2) var(--spacing-4);
  background-color: var(--color-bg-tertiary);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.size-btn:hover {
  background-color: var(--color-surface-hover);
}

.size-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.size-btn.active {
  border-color: var(--color-primary);
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
}

.danger-zone {
  border-top: 1px solid var(--color-error);
  padding-top: var(--spacing-4);
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
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
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
