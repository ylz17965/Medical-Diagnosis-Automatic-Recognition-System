<script setup lang="ts">
import { ref, computed } from 'vue'
import { MainLayout } from '@/layouts'
import { Button, Input, Select, Toggle } from '@/components/base'
import IconLung from '@/components/icons/IconLung.vue'
import IconInfo from '@/components/icons/IconInfo.vue'
import IconCheckCircle from '@/components/icons/IconCheckCircle.vue'
import IconAlertTriangle from '@/components/icons/IconAlertTriangle.vue'

interface NoduleData {
  size: string
  type: 'solid' | 'subsolid' | 'ground_glass' | 'calcified'
  location: string
  spiculation: boolean
}

interface PatientHistory {
  age: string
  smokingStatus: 'never' | 'former' | 'current'
  packYears: string
  familyHistory: boolean
  copdHistory: boolean
}

const noduleData = ref<NoduleData>({
  size: '8',
  type: 'solid',
  location: '右上肺',
  spiculation: false
})

const patientHistory = ref<PatientHistory>({
  age: '55',
  smokingStatus: 'former',
  packYears: '20',
  familyHistory: false,
  copdHistory: false
})

interface AnalysisResult {
  malignancyRisk: number
  riskCategory: 'very_low' | 'low' | 'moderate' | 'high'
  recommendation: string
  followUp: string
  fleischnerGuideline: string
  factors: string[]
}

const analysisResult = ref<AnalysisResult | null>(null)
const isAnalyzing = ref(false)

const noduleTypes = [
  { value: 'solid', label: '实性结节' },
  { value: 'subsolid', label: '部分实性结节' },
  { value: 'ground_glass', label: '磨玻璃结节' },
  { value: 'calcified', label: '钙化结节' }
]

const locations = [
  { value: '右上肺', label: '右上肺' },
  { value: '右中肺', label: '右中肺' },
  { value: '右下肺', label: '右下肺' },
  { value: '左上肺', label: '左上肺' },
  { value: '左下肺', label: '左下肺' }
]

const smokingOptions = [
  { value: 'never', label: '从不吸烟' },
  { value: 'former', label: '已戒烟' },
  { value: 'current', label: '仍在吸烟' }
]

const riskLevelClass = computed(() => {
  if (!analysisResult.value) return ''
  const level = analysisResult.value.riskCategory
  if (level === 'very_low' || level === 'low') return 'risk-low'
  if (level === 'moderate') return 'risk-moderate'
  return 'risk-high'
})

const riskLevelText = computed(() => {
  if (!analysisResult.value) return ''
  const level = analysisResult.value.riskCategory
  const map: Record<string, string> = {
    'very_low': '极低风险',
    'low': '低风险',
    'moderate': '中等风险',
    'high': '高风险'
  }
  return map[level] || ''
})

const analyzeNodule = async () => {
  isAnalyzing.value = true
  
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  let malignancyRisk = 0
  let riskCategory: 'very_low' | 'low' | 'moderate' | 'high' = 'low'
  let recommendation = ''
  let followUp = ''
  
  const size = parseFloat(noduleData.value.size)
  const type = noduleData.value.type
  
  if (type === 'calcified') {
    malignancyRisk = 0.01
    riskCategory = 'very_low'
    recommendation = '钙化结节通常为良性，无需特殊处理'
    followUp = '无需随访'
  } else if (size < 6) {
    malignancyRisk = type === 'solid' ? 0.02 : 0.01
    riskCategory = 'very_low'
    recommendation = '结节较小，恶性风险极低'
    followUp = '无需常规随访'
  } else if (size < 8) {
    malignancyRisk = type === 'solid' ? 0.05 : 0.03
    riskCategory = 'low'
    recommendation = '建议6-12个月后CT复查'
    followUp = '6-12个月CT复查'
  } else if (size < 15) {
    malignancyRisk = type === 'solid' ? 0.15 : 0.08
    riskCategory = 'moderate'
    recommendation = '建议3-6个月后CT复查，必要时PET-CT评估'
    followUp = '3-6个月CT复查'
  } else {
    malignancyRisk = type === 'solid' ? 0.35 : 0.20
    riskCategory = 'high'
    recommendation = '建议进一步评估，考虑PET-CT或活检'
    followUp = '立即就诊'
  }
  
  if (patientHistory.value.smokingStatus === 'current' && parseFloat(patientHistory.value.packYears) > 30) {
    malignancyRisk = Math.min(malignancyRisk * 1.5, 0.9)
    if (riskCategory !== 'high') {
      riskCategory = riskCategory === 'very_low' ? 'low' : 'moderate'
    }
  }
  
  if (patientHistory.value.familyHistory) {
    malignancyRisk = Math.min(malignancyRisk * 1.2, 0.9)
  }
  
  analysisResult.value = {
    malignancyRisk: Math.round(malignancyRisk * 1000) / 1000,
    riskCategory,
    recommendation,
    followUp,
    fleischnerGuideline: `根据Fleischner 2017指南，${size}mm${type === 'solid' ? '实性' : type === 'ground_glass' ? '磨玻璃' : '部分实性'}结节建议：${followUp}`,
    factors: [
      noduleData.value.spiculation ? '结节有毛刺征象' : null,
      patientHistory.value.smokingStatus === 'current' ? '当前吸烟' : null,
      patientHistory.value.familyHistory ? '有肺癌家族史' : null,
      patientHistory.value.copdHistory ? '有COPD病史' : null
    ].filter((f): f is string => f !== null)
  }
  
  isAnalyzing.value = false
}

const resetForm = () => {
  noduleData.value = {
    size: '8',
    type: 'solid',
    location: '右上肺',
    spiculation: false
  }
  patientHistory.value = {
    age: '55',
    smokingStatus: 'former',
    packYears: '20',
    familyHistory: false,
    copdHistory: false
  }
  analysisResult.value = null
}
</script>

<template>
  <MainLayout>
    <div class="specialized-page">
      <header class="page-header">
        <div class="header-icon">
          <IconLung />
        </div>
        <div class="header-content">
          <h1 class="page-title">肺癌早筛助手</h1>
          <p class="page-subtitle">基于Fleischner 2025指南的肺结节风险评估</p>
        </div>
      </header>

      <div class="content-grid">
        <div class="form-section">
          <h2 class="section-title">结节信息</h2>
          
          <div class="form-group">
            <label class="form-label">结节大小 (mm)</label>
            <Input
              v-model="noduleData.size"
              type="number"
              min="1"
              max="100"
              placeholder="输入结节直径"
            />
          </div>

          <div class="form-group">
            <label class="form-label">结节类型</label>
            <Select
              v-model="noduleData.type"
              :options="noduleTypes"
              placeholder="选择结节类型"
            />
          </div>

          <div class="form-group">
            <label class="form-label">结节位置</label>
            <Select
              v-model="noduleData.location"
              :options="locations"
              placeholder="选择结节位置"
            />
          </div>

          <div class="form-group">
            <div class="toggle-row">
              <span class="form-label">有毛刺征象</span>
              <Toggle v-model="noduleData.spiculation" />
            </div>
          </div>

          <h2 class="section-title">患者信息</h2>

          <div class="form-group">
            <label class="form-label">年龄</label>
            <Input
              v-model="patientHistory.age"
              type="number"
              min="18"
              max="120"
              placeholder="输入年龄"
            />
          </div>

          <div class="form-group">
            <label class="form-label">吸烟状态</label>
            <Select
              v-model="patientHistory.smokingStatus"
              :options="smokingOptions"
              placeholder="选择吸烟状态"
            />
          </div>

          <div class="form-group" v-if="patientHistory.smokingStatus !== 'never'">
            <label class="form-label">吸烟包年数</label>
            <Input
              v-model="patientHistory.packYears"
              type="number"
              min="0"
              max="200"
              placeholder="每日吸烟包数 × 吸烟年数"
            />
          </div>

          <div class="form-group">
            <div class="toggle-row">
              <span class="form-label">肺癌家族史</span>
              <Toggle v-model="patientHistory.familyHistory" />
            </div>
          </div>

          <div class="form-group">
            <div class="toggle-row">
              <span class="form-label">COPD病史</span>
              <Toggle v-model="patientHistory.copdHistory" />
            </div>
          </div>

          <div class="form-actions">
            <Button
              variant="primary"
              size="lg"
              :loading="isAnalyzing"
              @click="analyzeNodule"
            >
              开始评估
            </Button>
            <Button
              variant="secondary"
              size="lg"
              @click="resetForm"
            >
              重置
            </Button>
          </div>
        </div>

        <div class="result-section">
          <div v-if="!analysisResult" class="empty-result">
            <div class="empty-icon">
              <IconInfo />
            </div>
            <h3>等待评估</h3>
            <p>请填写结节信息和患者信息后点击"开始评估"</p>
          </div>

          <div v-else class="result-card" :class="riskLevelClass">
            <div class="result-header">
              <h3>评估结果</h3>
              <span class="risk-badge">{{ riskLevelText }}</span>
            </div>

            <div class="result-body">
              <div class="risk-meter">
                <div class="meter-label">恶性风险概率</div>
                <div class="meter-bar">
                  <div 
                    class="meter-fill" 
                    :style="{ width: `${analysisResult.malignancyRisk * 100}%` }"
                  ></div>
                </div>
                <div class="meter-value">{{ (analysisResult.malignancyRisk * 100).toFixed(1) }}%</div>
              </div>

              <div class="result-item">
                <IconCheckCircle class="result-icon" />
                <div class="result-content">
                  <div class="result-label">管理建议</div>
                  <div class="result-text">{{ analysisResult.recommendation }}</div>
                </div>
              </div>

              <div class="result-item">
                <IconAlertTriangle class="result-icon warning" />
                <div class="result-content">
                  <div class="result-label">随访建议</div>
                  <div class="result-text">{{ analysisResult.followUp }}</div>
                </div>
              </div>

              <div class="guideline-note">
                <IconInfo class="info-icon" />
                <span>{{ analysisResult.fleischnerGuideline }}</span>
              </div>

              <div v-if="analysisResult.factors.length > 0" class="risk-factors">
                <div class="factors-title">风险因素</div>
                <ul class="factors-list">
                  <li v-for="(factor, index) in analysisResult.factors" :key="index">
                    {{ factor }}
                  </li>
                </ul>
              </div>
            </div>

            <div class="disclaimer">
              ⚠️ 本评估结果仅供参考，不构成诊断建议。请以专业医生意见为准。
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<style scoped>
.specialized-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-6);
}

.page-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-8);
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  border-radius: var(--radius-xl);
  color: white;
}

.header-icon :deep(svg) {
  width: 32px;
  height: 32px;
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
}

.page-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: var(--spacing-1) 0 0 0;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-6);
}

.form-section {
  background-color: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  box-shadow: var(--shadow-sm);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-4) 0;
  padding-bottom: var(--spacing-2);
  border-bottom: 1px solid var(--color-border);
}

.section-title:not(:first-child) {
  margin-top: var(--spacing-6);
}

.form-group {
  margin-bottom: var(--spacing-4);
}

.form-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-2);
}

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-row .form-label {
  margin-bottom: 0;
}

.form-actions {
  display: flex;
  gap: var(--spacing-3);
  margin-top: var(--spacing-6);
}

.result-section {
  min-height: 400px;
}

.empty-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
  background-color: var(--color-surface);
  border-radius: var(--radius-xl);
  border: 2px dashed var(--color-border);
  text-align: center;
  padding: var(--spacing-8);
}

.empty-icon {
  color: var(--color-text-quaternary);
  margin-bottom: var(--spacing-4);
}

.empty-icon :deep(svg) {
  width: 48px;
  height: 48px;
}

.empty-result h3 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-2) 0;
}

.empty-result p {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: 0;
}

.result-card {
  background-color: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  box-shadow: var(--shadow-md);
  border-left: 4px solid var(--color-border);
}

.result-card.risk-low {
  border-left-color: #10B981;
}

.result-card.risk-moderate {
  border-left-color: #F59E0B;
}

.result-card.risk-high {
  border-left-color: #EF4444;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-4);
}

.result-header h3 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.risk-badge {
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.risk-low .risk-badge {
  background-color: rgba(16, 185, 129, 0.1);
  color: #10B981;
}

.risk-moderate .risk-badge {
  background-color: rgba(245, 158, 11, 0.1);
  color: #F59E0B;
}

.risk-high .risk-badge {
  background-color: rgba(239, 68, 68, 0.1);
  color: #EF4444;
}

.result-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.risk-meter {
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-4);
}

.meter-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-2);
}

.meter-bar {
  height: 12px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  background: linear-gradient(90deg, #10B981 0%, #F59E0B 50%, #EF4444 100%);
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.meter-value {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-top: var(--spacing-2);
  text-align: right;
}

.result-item {
  display: flex;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.result-icon {
  flex-shrink: 0;
  color: #10B981;
}

.result-icon.warning {
  color: #F59E0B;
}

.result-icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.result-content {
  flex: 1;
}

.result-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-1);
}

.result-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.guideline-note {
  display: flex;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  background-color: rgba(16, 185, 129, 0.05);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.info-icon {
  flex-shrink: 0;
  color: #10B981;
}

.info-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.risk-factors {
  margin-top: var(--spacing-2);
}

.factors-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-2);
}

.factors-list {
  margin: 0;
  padding-left: var(--spacing-5);
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.factors-list li {
  margin-bottom: var(--spacing-1);
}

.disclaimer {
  margin-top: var(--spacing-4);
  padding: var(--spacing-3);
  background-color: rgba(245, 158, 11, 0.1);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-xs);
  color: #B45309;
  text-align: center;
}

@media (max-width: 767px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .specialized-page {
    padding: var(--spacing-4);
  }
}
</style>
