<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { MainLayout } from '@/layouts'
import Button from '@/components/base/Button.vue'
import SUSSurvey from '@/components/business/SUSSurvey.vue'
import CustomSurvey from '@/components/business/CustomSurvey.vue'
import { analyticsService, type UserTestSession } from '@/services/analytics'

const router = useRouter()

const currentStep = ref(0)
const isCompleted = ref(false)
const sessionData = ref<UserTestSession | null>(null)
const susResult = ref<any>(null)
const customResult = ref<any>(null)

const steps = [
  { id: 'intro', title: '测试说明', description: '了解测试流程', icon: '📋' },
  { id: 'task1', title: '症状自查', description: '完成一次症状自查对话', icon: '💬' },
  { id: 'task2', title: '来源查看', description: '查看回答来源并评价可信度', icon: '🔍' },
  { id: 'sus', title: '可用性评估', description: '填写SUS量表', icon: '📊' },
  { id: 'custom', title: '体验调查', description: '填写自定义问卷', icon: '✏️' },
  { id: 'complete', title: '完成', description: '感谢参与', icon: '🎉' }
]

const goToChat = () => {
  analyticsService.resetSession()
  analyticsService.trackEvent('user_test_start', {
    step: 'task1',
    task: 'symptom_self_check'
  })
  router.push('/')
}

const handleSUSSubmit = (result: any) => {
  susResult.value = result
  analyticsService.trackEvent('sus_survey_completed', {
    susScore: result.susScore,
    adjectiveRating: result.adjectiveRating
  })
  nextStep()
}

const handleCustomSubmit = (result: any) => {
  customResult.value = result
  sessionData.value = analyticsService.endSession()
  analyticsService.trackEvent('custom_survey_completed', {
    accuracy: result.accuracy,
    usefulness: result.usefulness,
    explainability: result.explainability,
    nps: result.nps,
    comparison: result.comparison
  })
  nextStep()
}

const nextStep = () => {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const completeTest = () => {
  isCompleted.value = true
  analyticsService.trackEvent('user_test_completed', {
    totalSteps: steps.length,
    hasSUSSurvey: !!susResult.value,
    hasCustomSurvey: !!customResult.value
  })
  router.push('/')
}

onMounted(() => {
  analyticsService.trackEvent('user_test_page_viewed', {})
})
</script>

<template>
  <MainLayout>
    <div class="user-test-page">
      <div class="test-header">
        <h1 class="test-title">用户体验测试</h1>
        <p class="test-subtitle">感谢您参与AI健康助手的用户体验测试</p>
      </div>

      <div class="progress-indicator">
        <template v-for="(step, index) in steps" :key="step.id">
          <div
            class="step-item"
            :class="{ 
              active: index === currentStep,
              completed: index < currentStep 
            }"
          >
            <div class="step-number">{{ index + 1 }}</div>
            <div class="step-info">
              <span class="step-title">{{ step.title }}</span>
            </div>
          </div>
          <div v-if="index < steps.length - 1" class="step-connector" :class="{ completed: index < currentStep }"></div>
        </template>
      </div>

      <div class="test-content">
        <Transition name="fade-slide" mode="out-in">
          <div v-if="currentStep === 0" key="intro" class="step-panel intro-panel">
            <div class="intro-icon-wrapper">
              <div class="intro-icon">📋</div>
            </div>
            <h2 class="panel-title">测试说明</h2>
            <div class="intro-content">
              <p class="intro-desc">本次测试旨在评估AI健康助手的用户体验，测试约需 <strong>10-15分钟</strong>。</p>
              
              <div class="task-list">
                <h3 class="task-list-title">测试任务</h3>
                <div class="task-items">
                  <div class="task-item">
                    <div class="task-number">1</div>
                    <div class="task-detail">
                      <strong>症状自查</strong>
                      <p>模拟一次健康咨询场景，向系统描述您的症状，体验多轮对话功能。</p>
                    </div>
                  </div>
                  <div class="task-item">
                    <div class="task-number">2</div>
                    <div class="task-detail">
                      <strong>来源查看</strong>
                      <p>查看系统回答的来源溯源，评估可信度展示效果。</p>
                    </div>
                  </div>
                  <div class="task-item">
                    <div class="task-number">3</div>
                    <div class="task-detail">
                      <strong>问卷填写</strong>
                      <p>完成SUS可用性量表和自定义体验问卷。</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="notice-card">
                <div class="notice-icon">⚠️</div>
                <div class="notice-content">
                  <h4>重要提示</h4>
                  <ul>
                    <li>本系统仅供测试使用，不提供真实医疗诊断</li>
                    <li>测试数据仅用于产品改进研究</li>
                    <li>您可以随时退出测试</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="action-buttons">
              <Button variant="primary" size="lg" @click="nextStep">
                开始测试
              </Button>
            </div>
          </div>

          <div v-else-if="currentStep === 1" key="task1" class="step-panel task-panel">
            <div class="intro-icon-wrapper">
              <div class="intro-icon">💬</div>
            </div>
            <h2 class="panel-title">任务一：症状自查</h2>
            <div class="task-content">
              <p class="task-desc">请进入聊天界面，模拟一次健康咨询场景。</p>
              
              <div class="example-scenarios">
                <h4 class="scenarios-title">示例场景（任选其一）</h4>
                <div class="scenario-list">
                  <div class="scenario-item">
                    <span class="scenario-label">场景A</span>
                    <p>"我最近头痛，还有点发热"</p>
                  </div>
                  <div class="scenario-item">
                    <span class="scenario-label">场景B</span>
                    <p>"胃不舒服，吃饭后更明显"</p>
                  </div>
                  <div class="scenario-item">
                    <span class="scenario-label">场景C</span>
                    <p>"咳嗽好几天了，有痰"</p>
                  </div>
                </div>
              </div>

              <p class="task-hint">完成至少3轮对话后，返回本页面继续下一步。</p>
            </div>

            <div class="action-buttons">
              <Button variant="secondary" @click="prevStep">上一步</Button>
              <Button variant="primary" @click="goToChat">进入聊天</Button>
            </div>
          </div>

          <div v-else-if="currentStep === 2" key="task2" class="step-panel task-panel">
            <div class="intro-icon-wrapper">
              <div class="intro-icon">🔍</div>
            </div>
            <h2 class="panel-title">任务二：来源查看</h2>
            <div class="task-content">
              <p class="task-desc">请在聊天界面中：</p>
              <ol class="task-steps">
                <li>找到一条带有来源溯源的回答</li>
                <li>点击查看来源详情</li>
                <li>观察置信度显示</li>
              </ol>

              <div class="feature-highlight">
                <div class="feature-item">
                  <span class="feature-icon">📊</span>
                  <span>来源溯源卡片</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">✓</span>
                  <span>置信度指示器</span>
                </div>
              </div>
            </div>

            <div class="action-buttons">
              <Button variant="secondary" @click="prevStep">上一步</Button>
              <Button variant="primary" @click="nextStep">已完成查看</Button>
            </div>
          </div>

          <div v-else-if="currentStep === 3" key="sus" class="step-panel survey-panel">
            <h2 class="panel-title">系统可用性评估</h2>
            <p class="panel-desc">请根据刚才的使用体验，完成以下SUS量表</p>
            <SUSSurvey @submit="handleSUSSubmit" />
          </div>

          <div v-else-if="currentStep === 4" key="custom" class="step-panel survey-panel">
            <h2 class="panel-title">用户体验调查</h2>
            <p class="panel-desc">请回答以下关于使用体验的问题</p>
            <CustomSurvey @submit="handleCustomSubmit" />
          </div>

          <div v-else-if="currentStep === 5" key="complete" class="step-panel complete-panel">
            <div class="intro-icon-wrapper">
              <div class="intro-icon success">🎉</div>
            </div>
            <h2 class="panel-title">测试完成</h2>
            <p class="complete-desc">感谢您的参与！您的反馈对我们非常重要。</p>

            <div v-if="sessionData" class="session-summary">
              <h3 class="summary-title">本次测试统计</h3>
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="summary-value">{{ sessionData.metrics.totalMessages }}</span>
                  <span class="summary-label">对话轮数</span>
                </div>
                <div class="summary-item">
                  <span class="summary-value">{{ sessionData.metrics.featuresUsed.length }}</span>
                  <span class="summary-label">使用功能数</span>
                </div>
                <div class="summary-item">
                  <span class="summary-value">{{ Math.round(sessionData.metrics.avgResponseTime) }}ms</span>
                  <span class="summary-label">平均响应</span>
                </div>
              </div>
            </div>

            <div v-if="susResult" class="result-card">
              <h4 class="result-title">SUS评分</h4>
              <div class="sus-score">{{ susResult.susScore }}</div>
              <span class="sus-rating" :class="`rating-${susResult.adjectiveRating}`">{{ susResult.adjectiveRating }}</span>
            </div>

            <div class="action-buttons">
              <Button variant="primary" size="lg" @click="completeTest">
                返回主页
              </Button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </MainLayout>
</template>

<style scoped>
.user-test-page {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-6);
}

.test-header {
  text-align: center;
  margin-bottom: var(--spacing-8);
}

.test-title {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-2) 0;
  letter-spacing: var(--letter-spacing-title2);
}

.test-subtitle {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  margin: 0;
  letter-spacing: var(--letter-spacing-normal);
}

.progress-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-8);
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-2);
}

.step-number {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  transition: all var(--transition-normal);
}

.step-item.active .step-number {
  border-color: var(--color-primary);
  background: var(--color-primary-gradient);
  color: var(--color-text-inverse);
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.25);
}

.step-item.completed .step-number {
  border-color: var(--color-success);
  background: var(--color-success);
  color: var(--color-text-inverse);
}

.step-info {
  text-align: center;
}

.step-title {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: var(--font-weight-medium);
  letter-spacing: var(--letter-spacing-caption);
}

.step-item.active .step-title {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
}

.step-connector {
  width: 40px;
  height: 2px;
  background: var(--color-border);
  margin: 0 var(--spacing-1);
  margin-bottom: 24px;
  transition: background var(--transition-normal);
}

.step-connector.completed {
  background: var(--color-success);
}

.test-content {
  background: var(--color-surface);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-8);
  box-shadow: var(--shadow-md);
}

.fade-slide-enter-active {
  transition: all 0.3s ease-out;
}

.fade-slide-leave-active {
  transition: all 0.2s ease-in;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.step-panel {
  text-align: center;
}

.intro-icon-wrapper {
  margin-bottom: var(--spacing-4);
}

.intro-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  font-size: 36px;
  background: var(--color-fill-primary);
  border-radius: var(--radius-xl);
}

.intro-icon.success {
  background: var(--color-success-bg);
}

.panel-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-2) 0;
  letter-spacing: var(--letter-spacing-title3);
}

.panel-desc {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-6);
  letter-spacing: var(--letter-spacing-normal);
}

.intro-content {
  text-align: left;
  margin-bottom: var(--spacing-6);
}

.intro-desc {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-4);
  line-height: var(--line-height-body);
  letter-spacing: var(--letter-spacing-normal);
}

.intro-desc strong {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
}

.task-list {
  background: var(--color-bg-primary);
  border-radius: var(--radius-xl);
  padding: var(--spacing-5);
  margin-bottom: var(--spacing-4);
}

.task-list-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-4) 0;
  letter-spacing: var(--letter-spacing-normal);
}

.task-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.task-item {
  display: flex;
  gap: var(--spacing-3);
  align-items: flex-start;
}

.task-item .task-number {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  background: var(--color-primary-gradient);
  color: var(--color-text-inverse);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.task-detail {
  flex: 1;
}

.task-detail strong {
  display: block;
  color: var(--color-text-primary);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-1);
  letter-spacing: var(--letter-spacing-normal);
}

.task-detail p {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-subhead);
  letter-spacing: var(--letter-spacing-normal);
}

.notice-card {
  display: flex;
  gap: var(--spacing-3);
  background: var(--color-warning-bg);
  border-radius: var(--radius-xl);
  padding: var(--spacing-4);
}

.notice-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.notice-content h4 {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-warning-dark);
  margin: 0 0 var(--spacing-2) 0;
  letter-spacing: var(--letter-spacing-normal);
}

.notice-content ul {
  margin: 0;
  padding-left: var(--spacing-4);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-subhead);
  letter-spacing: var(--letter-spacing-normal);
}

.notice-content li {
  margin-bottom: var(--spacing-1);
}

.task-content {
  text-align: left;
  margin-bottom: var(--spacing-6);
}

.task-desc {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-4);
  letter-spacing: var(--letter-spacing-normal);
}

.example-scenarios {
  background: var(--color-bg-primary);
  border-radius: var(--radius-xl);
  padding: var(--spacing-4);
  margin: var(--spacing-4) 0;
}

.scenarios-title {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: 0 0 var(--spacing-3) 0;
  letter-spacing: var(--letter-spacing-normal);
}

.scenario-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.scenario-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  transition: all var(--transition-fast);
}

.scenario-item:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.scenario-label {
  background: var(--color-primary-gradient);
  color: var(--color-text-inverse);
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-caption);
}

.scenario-item p {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  margin: 0;
  letter-spacing: var(--letter-spacing-normal);
}

.task-hint {
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
  letter-spacing: var(--letter-spacing-normal);
}

.task-steps {
  margin: var(--spacing-4) 0;
  padding-left: var(--spacing-5);
}

.task-steps li {
  margin-bottom: var(--spacing-2);
  color: var(--color-text-primary);
  letter-spacing: var(--letter-spacing-normal);
}

.feature-highlight {
  display: flex;
  justify-content: center;
  gap: var(--spacing-4);
  margin-top: var(--spacing-4);
}

.feature-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  letter-spacing: var(--letter-spacing-normal);
}

.feature-icon {
  font-size: var(--font-size-lg);
}

.complete-desc {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-6);
  letter-spacing: var(--letter-spacing-normal);
}

.session-summary {
  background: var(--color-bg-primary);
  border-radius: var(--radius-xl);
  padding: var(--spacing-5);
  margin: var(--spacing-6) auto;
  max-width: 400px;
}

.summary-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  margin: 0 0 var(--spacing-4) 0;
  color: var(--color-text-primary);
  letter-spacing: var(--letter-spacing-normal);
}

.summary-grid {
  display: flex;
  justify-content: space-around;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-1);
}

.summary-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  letter-spacing: var(--letter-spacing-title3);
}

.summary-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  letter-spacing: var(--letter-spacing-caption);
}

.result-card {
  background: var(--color-bg-primary);
  border-radius: var(--radius-xl);
  padding: var(--spacing-5);
  margin: var(--spacing-4) auto;
  max-width: 200px;
}

.result-title {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: 0 0 var(--spacing-2) 0;
  letter-spacing: var(--letter-spacing-normal);
}

.sus-score {
  font-size: 48px;
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  letter-spacing: var(--letter-spacing-title1);
}

.sus-rating {
  display: inline-block;
  padding: var(--spacing-1) var(--spacing-4);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-normal);
}

.sus-rating.rating-优秀 {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.sus-rating.rating-良好 {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.sus-rating.rating-一般 {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.sus-rating.rating-较差,
.sus-rating.rating-差 {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: var(--spacing-4);
  margin-top: var(--spacing-6);
}

@media (max-width: 767px) {
  .user-test-page {
    padding: var(--spacing-4);
  }

  .test-content {
    padding: var(--spacing-5);
    border-radius: var(--radius-xl);
  }

  .progress-indicator {
    flex-wrap: wrap;
    gap: var(--spacing-2);
  }

  .step-connector {
    display: none;
  }

  .step-title {
    display: none;
  }

  .feature-highlight {
    flex-direction: column;
    align-items: center;
  }

  .summary-grid {
    flex-direction: column;
    gap: var(--spacing-4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .fade-slide-enter-active,
  .fade-slide-leave-active {
    transition: none;
  }
}
</style>
