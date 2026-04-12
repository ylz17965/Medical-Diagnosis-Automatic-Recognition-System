<script setup lang="ts">
import { ref, computed } from 'vue'
import { MainLayout } from '@/layouts'
import { Button, Input, Select, Toggle } from '@/components/base'
import IconHeart from '@/components/icons/IconHeart.vue'
import IconInfo from '@/components/icons/IconInfo.vue'
import IconCheckCircle from '@/components/icons/IconCheckCircle.vue'

interface BPReading {
  systolic: string
  diastolic: string
  timestamp: string
}

interface PatientProfile {
  age: string
  gender: 'male' | 'female'
  smoking: boolean
  diabetes: boolean
  kidneyDisease: boolean
  establishedCVD: boolean
  familyHistory: boolean
}

const bpReadings = ref<BPReading[]>([
  { systolic: '145', diastolic: '92', timestamp: new Date().toISOString() }
])

const patientProfile = ref<PatientProfile>({
  age: '55',
  gender: 'male',
  smoking: false,
  diabetes: false,
  kidneyDisease: false,
  establishedCVD: false,
  familyHistory: false
})

interface BPAnalysisResult {
  classification: string
  avgBP: { systolic: number; diastolic: number }
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high'
  tenYearRisk: number
  riskFactors: string[]
  targetBP: { systolic: number; diastolic: number }
  recommendations: string[]
  followUpInterval: string
  medications: Array<{ name: string; reason: string; dosage: string }>
}

const analysisResult = ref<BPAnalysisResult | null>(null)
const isAnalyzing = ref(false)

const genderOptions = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' }
]

const addReading = () => {
  bpReadings.value.push({
    systolic: '120',
    diastolic: '80',
    timestamp: new Date().toISOString()
  })
}

const removeReading = (index: number) => {
  if (bpReadings.value.length > 1) {
    bpReadings.value.splice(index, 1)
  }
}

const avgBP = computed(() => {
  const avgSystolic = bpReadings.value.reduce((sum, r) => sum + parseFloat(r.systolic), 0) / bpReadings.value.length
  const avgDiastolic = bpReadings.value.reduce((sum, r) => sum + parseFloat(r.diastolic), 0) / bpReadings.value.length
  return {
    systolic: Math.round(avgSystolic),
    diastolic: Math.round(avgDiastolic)
  }
})

const bpClass = computed(() => {
  const { systolic, diastolic } = avgBP.value
  if (systolic < 120 && diastolic < 80) return { category: '正常血压', color: 'green' }
  if (systolic < 140 && diastolic < 90) return { category: '正常高值', color: 'yellow' }
  if (systolic < 160 && diastolic < 100) return { category: '高血压1级(轻度)', color: 'orange' }
  if (systolic < 180 && diastolic < 110) return { category: '高血压2级(中度)', color: 'red' }
  return { category: '高血压3级(重度)', color: 'danger' }
})

const analyzeBP = async () => {
  isAnalyzing.value = true
  
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  let riskScore = 0
  const riskFactors: string[] = []
  
  const age = parseInt(patientProfile.value.age) || 0
  
  if (age >= 55 && patientProfile.value.gender === 'male' ||
      age >= 65 && patientProfile.value.gender === 'female') {
    riskScore += 2
    riskFactors.push('年龄因素')
  }
  
  if (patientProfile.value.smoking) {
    riskScore += 2
    riskFactors.push('吸烟')
  }
  
  if (patientProfile.value.diabetes) {
    riskScore += 3
    riskFactors.push('糖尿病')
  }
  
  if (patientProfile.value.kidneyDisease) {
    riskScore += 4
    riskFactors.push('慢性肾脏病')
  }
  
  if (patientProfile.value.establishedCVD) {
    riskScore += 5
    riskFactors.push('已确诊心血管疾病')
  }
  
  if (patientProfile.value.familyHistory) {
    riskScore += 1
    riskFactors.push('早发心血管病家族史')
  }
  
  const baseRisk = patientProfile.value.gender === 'male' ? 5 : 3
  const ageAdjustment = Math.max(0, (age - 40) * 0.5)
  let tenYearRisk = (baseRisk + ageAdjustment + riskScore * 2) / 100
  tenYearRisk = Math.min(0.8, Math.max(0.01, tenYearRisk))
  
  let riskLevel: 'low' | 'moderate' | 'high' | 'very_high' = 'low'
  let followUpInterval = '12个月'
  
  if (patientProfile.value.establishedCVD || patientProfile.value.kidneyDisease || tenYearRisk >= 0.2) {
    riskLevel = 'very_high'
    followUpInterval = '1个月'
  } else if (tenYearRisk >= 0.1 || patientProfile.value.diabetes) {
    riskLevel = 'high'
    followUpInterval = '3个月'
  } else if (tenYearRisk >= 0.05 || riskFactors.length >= 2) {
    riskLevel = 'moderate'
    followUpInterval = '6个月'
  }
  
  const targetBP = (patientProfile.value.diabetes || patientProfile.value.kidneyDisease)
    ? { systolic: 130, diastolic: 80 }
    : { systolic: 140, diastolic: 90 }
  
  const recommendations: string[] = []
  
  if (avgBP.value.systolic >= 140 || avgBP.value.diastolic >= 90) {
    recommendations.push('建议改善生活方式')
    recommendations.push('限制钠盐摄入(<5g/天)')
    recommendations.push('规律有氧运动，每周≥150分钟')
    
    if (riskLevel === 'high' || riskLevel === 'very_high') {
      recommendations.push('建议启动降压药物治疗')
    }
  }
  
  recommendations.push('定期监测血压')
  
  analysisResult.value = {
    classification: bpClass.value.category,
    avgBP: avgBP.value,
    riskLevel,
    tenYearRisk: Math.round(tenYearRisk * 1000) / 1000,
    riskFactors,
    targetBP,
    recommendations,
    followUpInterval,
    medications: generateMedicationRecommendations(riskLevel)
  }
  
  isAnalyzing.value = false
}

const generateMedicationRecommendations = (riskLevel: string) => {
  const meds = []
  
  if (patientProfile.value.diabetes) {
    meds.push({ name: 'ACEI或ARB类', reason: '糖尿病首选，有肾脏保护作用', dosage: '如培哚普利4-8mg qd' })
  } else if (patientProfile.value.kidneyDisease) {
    meds.push({ name: 'ARB类', reason: '肾功能不全首选', dosage: '如缬沙坦80-160mg qd' })
  } else if (patientProfile.value.establishedCVD) {
    meds.push({ name: 'β受体阻滞剂', reason: '冠心病首选', dosage: '如美托洛尔缓释片47.5-95mg qd' })
  } else {
    meds.push({ name: 'CCB类', reason: '一线降压药', dosage: '如氨氯地平5-10mg qd' })
  }
  
  if (riskLevel === 'high' || riskLevel === 'very_high') {
    meds.push({ name: '利尿剂', reason: '联合用药增强降压效果', dosage: '如氢氯噻嗪12.5-25mg qd' })
  }
  
  return meds
}

const resetForm = () => {
  bpReadings.value = [
    { systolic: '145', diastolic: '92', timestamp: new Date().toISOString() }
  ]
  patientProfile.value = {
    age: '55',
    gender: 'male',
    smoking: false,
    diabetes: false,
    kidneyDisease: false,
    establishedCVD: false,
    familyHistory: false
  }
  analysisResult.value = null
}

const riskLevelClass = computed(() => {
  if (!analysisResult.value) return ''
  const level = analysisResult.value.riskLevel
  if (level === 'low') return 'risk-low'
  if (level === 'moderate') return 'risk-moderate'
  if (level === 'high') return 'risk-high'
  return 'risk-very-high'
})
</script>

<template>
  <MainLayout>
    <div class="specialized-page">
      <header class="page-header">
        <div class="header-icon heart">
          <IconHeart />
        </div>
        <div class="header-content">
          <h1 class="page-title">高血压管理助手</h1>
          <p class="page-subtitle">基于中国高血压防治指南2024的智能评估</p>
        </div>
      </header>

      <div class="content-grid">
        <div class="form-section">
          <h2 class="section-title">血压数据</h2>
          
          <div class="readings-list">
            <div 
              v-for="(reading, index) in bpReadings" 
              :key="index" 
              class="reading-row"
            >
              <div class="reading-inputs">
                <div class="reading-group">
                  <label class="reading-label">收缩压</label>
                  <Input
                    v-model="reading.systolic"
                    type="number"
                    min="60"
                    max="300"
                    placeholder="SBP"
                  />
                </div>
                <span class="reading-separator">/</span>
                <div class="reading-group">
                  <label class="reading-label">舒张压</label>
                  <Input
                    v-model="reading.diastolic"
                    type="number"
                    min="40"
                    max="200"
                    placeholder="DBP"
                  />
                </div>
                <span class="reading-unit">mmHg</span>
              </div>
              <button 
                v-if="bpReadings.length > 1"
                class="remove-btn"
                @click="removeReading(index)"
              >
                ×
              </button>
            </div>
          </div>

          <Button variant="secondary" size="sm" @click="addReading">
            + 添加更多读数
          </Button>

          <div class="avg-display">
            <span class="avg-label">平均血压:</span>
            <span class="avg-value">{{ avgBP.systolic }}/{{ avgBP.diastolic }} mmHg</span>
            <span class="avg-class" :class="bpClass.color">{{ bpClass.category }}</span>
          </div>

          <h2 class="section-title">患者信息</h2>

          <div class="form-row">
            <div class="form-group half">
              <label class="form-label">年龄</label>
              <Input
                v-model="patientProfile.age"
                type="number"
                min="18"
                max="120"
                placeholder="年龄"
              />
            </div>
            <div class="form-group half">
              <label class="form-label">性别</label>
              <Select
                v-model="patientProfile.gender"
                :options="genderOptions"
                placeholder="选择性别"
              />
            </div>
          </div>

          <div class="toggle-grid">
            <div class="toggle-item">
              <span class="toggle-label">吸烟</span>
              <Toggle v-model="patientProfile.smoking" />
            </div>
            <div class="toggle-item">
              <span class="toggle-label">糖尿病</span>
              <Toggle v-model="patientProfile.diabetes" />
            </div>
            <div class="toggle-item">
              <span class="toggle-label">慢性肾脏病</span>
              <Toggle v-model="patientProfile.kidneyDisease" />
            </div>
            <div class="toggle-item">
              <span class="toggle-label">已确诊心血管疾病</span>
              <Toggle v-model="patientProfile.establishedCVD" />
            </div>
            <div class="toggle-item">
              <span class="toggle-label">早发心血管病家族史</span>
              <Toggle v-model="patientProfile.familyHistory" />
            </div>
          </div>

          <div class="form-actions">
            <Button
              variant="primary"
              size="lg"
              :loading="isAnalyzing"
              @click="analyzeBP"
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
            <p>请填写血压数据和患者信息后点击"开始评估"</p>
          </div>

          <div v-else class="result-card" :class="riskLevelClass">
            <div class="result-header">
              <h3>评估结果</h3>
              <span class="risk-badge">{{ analysisResult.riskLevel === 'low' ? '低危' : analysisResult.riskLevel === 'moderate' ? '中危' : analysisResult.riskLevel === 'high' ? '高危' : '很高危' }}</span>
            </div>

            <div class="result-body">
              <div class="bp-summary">
                <div class="bp-item">
                  <div class="bp-label">血压分类</div>
                  <div class="bp-value">{{ analysisResult.classification }}</div>
                </div>
                <div class="bp-item">
                  <div class="bp-label">目标血压</div>
                  <div class="bp-value">{{ analysisResult.targetBP.systolic }}/{{ analysisResult.targetBP.diastolic }} mmHg</div>
                </div>
              </div>

              <div class="risk-meter">
                <div class="meter-header">
                  <span class="meter-label">10年心血管风险</span>
                  <span class="meter-value">{{ (analysisResult.tenYearRisk * 100).toFixed(1) }}%</span>
                </div>
                <div class="meter-bar">
                  <div 
                    class="meter-fill" 
                    :style="{ width: `${Math.min(analysisResult.tenYearRisk * 100, 100)}%` }"
                  ></div>
                </div>
              </div>

              <div v-if="analysisResult.riskFactors.length > 0" class="risk-factors-section">
                <div class="factors-title">危险因素</div>
                <div class="factors-tags">
                  <span v-for="(factor, index) in analysisResult.riskFactors" :key="index" class="factor-tag">
                    {{ factor }}
                  </span>
                </div>
              </div>

              <div class="result-item">
                <IconCheckCircle class="result-icon" />
                <div class="result-content">
                  <div class="result-label">随访间隔</div>
                  <div class="result-text">{{ analysisResult.followUpInterval }}</div>
                </div>
              </div>

              <div class="recommendations-section">
                <div class="section-title-sm">管理建议</div>
                <ul class="recommendations-list">
                  <li v-for="(rec, index) in analysisResult.recommendations" :key="index">
                    {{ rec }}
                  </li>
                </ul>
              </div>

              <div v-if="analysisResult.medications.length > 0" class="medications-section">
                <div class="section-title-sm">用药建议</div>
                <div class="medications-list">
                  <div v-for="(med, index) in analysisResult.medications" :key="index" class="medication-item">
                    <div class="med-name">{{ med.name }}</div>
                    <div class="med-reason">{{ med.reason }}</div>
                    <div class="med-dosage">{{ med.dosage }}</div>
                  </div>
                </div>
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
  background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
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

.readings-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-3);
}

.reading-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.reading-inputs {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-2);
  flex: 1;
}

.reading-group {
  flex: 1;
}

.reading-label {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-1);
}

.reading-separator {
  font-size: var(--font-size-xl);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-2);
}

.reading-unit {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-2);
}

.remove-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-lg);
  background-color: var(--color-bg-secondary);
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  font-size: var(--font-size-lg);
  transition: all var(--transition-fast);
}

.remove-btn:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: #EF4444;
}

.avg-display {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  margin-top: var(--spacing-4);
}

.avg-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.avg-value {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.avg-class {
  margin-left: auto;
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.avg-class.green {
  background-color: rgba(16, 185, 129, 0.1);
  color: #10B981;
}

.avg-class.yellow {
  background-color: rgba(245, 158, 11, 0.1);
  color: #F59E0B;
}

.avg-class.orange {
  background-color: rgba(249, 115, 22, 0.1);
  color: #F97316;
}

.avg-class.red, .avg-class.danger {
  background-color: rgba(239, 68, 68, 0.1);
  color: #EF4444;
}

.form-row {
  display: flex;
  gap: var(--spacing-3);
}

.form-group.half {
  flex: 1;
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

.toggle-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.toggle-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-2) var(--spacing-3);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.toggle-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
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
  border-left-color: #F97316;
}

.result-card.risk-very-high {
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
  background-color: rgba(249, 115, 22, 0.1);
  color: #F97316;
}

.risk-very-high .risk-badge {
  background-color: rgba(239, 68, 68, 0.1);
  color: #EF4444;
}

.result-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.bp-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-3);
}

.bp-item {
  padding: var(--spacing-3);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  text-align: center;
}

.bp-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-1);
}

.bp-value {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.risk-meter {
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-3);
}

.meter-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-2);
}

.meter-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.meter-value {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.meter-bar {
  height: 8px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  background: linear-gradient(90deg, #10B981 0%, #F59E0B 40%, #EF4444 100%);
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.risk-factors-section {
  padding: var(--spacing-3);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.factors-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-2);
}

.factors-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.factor-tag {
  padding: var(--spacing-1) var(--spacing-2);
  background-color: rgba(239, 68, 68, 0.1);
  color: #EF4444;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
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

.section-title-sm {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-2);
}

.recommendations-section {
  padding: var(--spacing-3);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.recommendations-list {
  margin: 0;
  padding-left: var(--spacing-5);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.recommendations-list li {
  margin-bottom: var(--spacing-1);
}

.medications-section {
  padding: var(--spacing-3);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.medications-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.medication-item {
  padding: var(--spacing-2);
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  border-left: 3px solid #EF4444;
}

.med-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.med-reason {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-1);
}

.med-dosage {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--spacing-1);
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

  .toggle-grid {
    grid-template-columns: 1fr;
  }

  .specialized-page {
    padding: var(--spacing-4);
  }

  .bp-summary {
    grid-template-columns: 1fr;
  }
}
</style>
