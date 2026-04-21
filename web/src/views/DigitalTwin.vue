<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { MainLayout } from '@/layouts'
import { useUserStore } from '@/stores/user'
import createLogger from '@/utils/logger'

const log = createLogger('DigitalTwin')
const router = useRouter()
const userStore = useUserStore()

interface OrganModel {
  id: string
  name: string
  nameEn: string
  color: string
  indicators: Indicator[]
  position: { x: number; y: number; z: number }
  rotation: number
  relatedIndicators?: string[]
}

interface Indicator {
  name: string
  value: number
  unit: string
  normalRange: [number, number]
  status: 'normal' | 'warning' | 'danger'
}

const organs = ref<OrganModel[]>([])
const isLoading = ref(true)
const dataSource = ref<string>('default')
const lastUpdated = ref<string>('')

const selectedOrgan = ref<OrganModel | null>(null)
const autoRotate = ref(true)
const rotationAngle = ref(0)

let animationFrame: number

const fetchDigitalTwinData = async () => {
  try {
    isLoading.value = true
    const userId = userStore.user?.id || 'default'
    const response = await fetch(`/api/v1/digital-twin/patients/${userId}`)
    
    if (!response.ok) {
      const organsResponse = await fetch('/api/v1/digital-twin/organs')
      if (organsResponse.ok) {
        const organsData = await organsResponse.json()
        organs.value = organsData.data.map((organ: OrganModel) => ({
          ...organ,
          position: { x: 0, y: 0, z: 0 },
          rotation: 0,
          indicators: organ.relatedIndicators?.map((name: string) => ({
            name,
            value: 0,
            unit: '',
            normalRange: [0, 100] as [number, number],
            status: 'normal' as const,
          })) || [],
        }))
        dataSource.value = 'default'
      }
      return
    }
    
    const data = await response.json()
    if (data.success && data.data) {
      organs.value = data.data.organs.map((organ: OrganModel) => ({
        ...organ,
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        indicators: organ.relatedIndicators?.map((name: string) => ({
          name,
          value: 0,
          unit: '',
          normalRange: [0, 100] as [number, number],
          status: 'normal' as const,
        })) || [],
      }))
      dataSource.value = 'patient_record'
      lastUpdated.value = data.data.lastUpdated
    }
    
    log.info('Digital twin data loaded', { source: dataSource.value })
  } catch (error) {
    log.error('Failed to fetch digital twin data', { error })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchDigitalTwinData()
  startAnimation()
})

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
})

const startAnimation = () => {
  const animate = () => {
    if (autoRotate.value) {
      rotationAngle.value += 0.5
      if (rotationAngle.value >= 360) {
        rotationAngle.value = 0
      }
    }
    animationFrame = requestAnimationFrame(animate)
  }
  animate()
}

const selectOrgan = (organ: OrganModel) => {
  selectedOrgan.value = organ
  autoRotate.value = false
}

const clearSelection = () => {
  selectedOrgan.value = null
  autoRotate.value = true
}

const getOrganStyle = (organ: OrganModel, index: number) => {
  const angle = (index * 60 + rotationAngle.value) * (Math.PI / 180)
  const radius = 150
  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius
  
  const scale = selectedOrgan.value 
    ? (selectedOrgan.value.id === organ.id ? 1.2 : 0.8)
    : 1
  
  const isSelected = selectedOrgan.value?.id === organ.id
  
  return {
    transform: `translateX(${x}px) translateZ(${z}px) scale(${scale})`,
    opacity: selectedOrgan.value && !isSelected ? 0.5 : 1,
    zIndex: isSelected ? 10 : 1
  }
}

const getIndicatorStatusClass = (status: string) => {
  return {
    'status-normal': status === 'normal',
    'status-warning': status === 'warning',
    'status-danger': status === 'danger'
  }
}

const overallHealthScore = computed(() => {
  let totalIndicators = 0
  let normalIndicators = 0
  
  organs.value.forEach(organ => {
    organ.indicators.forEach(ind => {
      totalIndicators++
      if (ind.status === 'normal') normalIndicators++
    })
  })
  
  return Math.round((normalIndicators / totalIndicators) * 100)
})

const healthStatusText = computed(() => {
  const score = overallHealthScore.value
  if (score >= 90) return '优秀'
  if (score >= 70) return '良好'
  if (score >= 50) return '一般'
  return '需关注'
})
</script>

<template>
  <MainLayout>
    <div class="digital-twin-container">
      <header class="twin-header">
        <button class="back-btn" @click="router.push('/')" aria-label="返回首页">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>数字孪生 - 器官健康可视化</h1>
        <div class="health-score">
        <div class="score-circle" :style="{ '--score': overallHealthScore }">
          <span class="score-value">{{ overallHealthScore }}</span>
        </div>
        <div class="score-info">
          <span class="score-label">健康评分</span>
          <span class="score-status">{{ healthStatusText }}</span>
        </div>
      </div>
    </header>

    <div class="twin-content">
      <div class="organ-viewer">
        <div class="perspective-container">
          <div class="organ-carousel" :style="{ transform: `rotateY(${rotationAngle * 0.1}deg)` }">
            <div
              v-for="(organ, index) in organs"
              :key="organ.id"
              class="organ-card"
              :class="{ selected: selectedOrgan?.id === organ.id }"
              :style="getOrganStyle(organ, index)"
              @click="selectOrgan(organ)"
            >
              <div class="organ-visual" :style="{ backgroundColor: organ.color }">
                <div class="organ-icon">
                  {{ organ.name.charAt(0) }}
                </div>
              </div>
              <div class="organ-info">
                <h3>{{ organ.name }}</h3>
                <span class="organ-en">{{ organ.nameEn }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="controls">
          <button 
            class="control-btn" 
            :class="{ active: autoRotate }"
            @click="autoRotate = !autoRotate"
          >
            {{ autoRotate ? '暂停旋转' : '自动旋转' }}
          </button>
          <button 
            v-if="selectedOrgan"
            class="control-btn"
            @click="clearSelection"
          >
            返回总览
          </button>
        </div>
      </div>

      <div class="indicator-panel">
        <div v-if="!selectedOrgan" class="panel-overview">
          <h2>器官健康概览</h2>
          <div class="organ-list">
            <div 
              v-for="organ in organs" 
              :key="organ.id"
              class="organ-item"
              @click="selectOrgan(organ)"
            >
              <div class="organ-color" :style="{ backgroundColor: organ.color }"></div>
              <span class="organ-name">{{ organ.name }}</span>
              <div class="indicator-count">
                {{ organ.indicators.filter(i => i.status === 'normal').length }}/{{ organ.indicators.length }} 正常
              </div>
            </div>
          </div>
        </div>

        <div v-else class="panel-detail">
          <div class="detail-header">
            <div class="organ-color" :style="{ backgroundColor: selectedOrgan.color }"></div>
            <h2>{{ selectedOrgan.name }}</h2>
            <span class="organ-en">{{ selectedOrgan.nameEn }}</span>
          </div>

          <div class="indicators">
            <div 
              v-for="(indicator, index) in selectedOrgan.indicators"
              :key="index"
              class="indicator-item"
              :class="getIndicatorStatusClass(indicator.status)"
            >
              <div class="indicator-header">
                <span class="indicator-name">{{ indicator.name }}</span>
                <span class="indicator-status">
                  {{ indicator.status === 'normal' ? '正常' : indicator.status === 'warning' ? '注意' : '异常' }}
                </span>
              </div>
              <div class="indicator-value">
                <span class="value">{{ indicator.value }}</span>
                <span class="unit">{{ indicator.unit }}</span>
              </div>
              <div class="indicator-range">
                参考范围: {{ indicator.normalRange[0] }} - {{ indicator.normalRange[1] }} {{ indicator.unit }}
              </div>
              <div class="indicator-bar">
                <div 
                  class="bar-fill"
                  :style="{ 
                    width: `${Math.min(100, (indicator.value / indicator.normalRange[1]) * 100)}%`,
                    backgroundColor: indicator.status === 'normal' ? selectedOrgan.color : 
                      indicator.status === 'warning' ? '#F59E0B' : '#EF4444'
                  }"
                ></div>
              </div>
            </div>
          </div>

          <div class="organ-advice">
            <h4>健康建议</h4>
            <ul>
              <li>定期体检，关注指标变化</li>
              <li>保持健康生活方式</li>
              <li>如有异常，及时就医</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <footer class="twin-footer">
      <p>数字孪生可视化仅供演示，实际数据请以体检报告为准</p>
    </footer>
    </div>
  </MainLayout>
</template>

<style scoped>
.digital-twin-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #fff;
}

.twin-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-6);
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.4);
  border-radius: var(--radius-md);
  color: #818cf8;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.back-btn:hover {
  background: rgba(99, 102, 241, 0.3);
  border-color: #818cf8;
}

.twin-header h1 {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  background: linear-gradient(90deg, #818cf8, #c084fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.health-score {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.score-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: conic-gradient(
    #10B981 0deg calc(var(--score) * 3.6deg),
    rgba(255, 255, 255, 0.1) calc(var(--score) * 3.6deg) 360deg
  );
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-circle::before {
  content: '';
  position: absolute;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #1e293b;
}

.score-value {
  position: relative;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.score-info {
  display: flex;
  flex-direction: column;
}

.score-label {
  font-size: var(--font-size-sm);
  color: #94a3b8;
}

.score-status {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: #10B981;
}

.twin-content {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: var(--spacing-6);
}

.organ-viewer {
  background: rgba(30, 41, 59, 0.5);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.perspective-container {
  perspective: 1000px;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.organ-carousel {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.1s linear;
}

.organ-card {
  position: absolute;
  left: 50%;
  top: 50%;
  margin-left: -80px;
  margin-top: -80px;
  width: 160px;
  height: 160px;
  background: rgba(30, 41, 59, 0.8);
  border-radius: var(--radius-xl);
  border: 2px solid rgba(99, 102, 241, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
}

.organ-card:hover {
  border-color: rgba(99, 102, 241, 0.6);
  transform: scale(1.05);
}

.organ-card.selected {
  border-color: #818cf8;
  box-shadow: 0 0 30px rgba(129, 140, 248, 0.3);
}

.organ-visual {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.organ-icon {
  font-size: 32px;
  font-weight: var(--font-weight-bold);
  color: white;
}

.organ-info {
  text-align: center;
}

.organ-info h3 {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}

.organ-en {
  font-size: var(--font-size-xs);
  color: #94a3b8;
}

.controls {
  display: flex;
  justify-content: center;
  gap: var(--spacing-3);
  margin-top: var(--spacing-4);
}

.control-btn {
  padding: var(--spacing-2) var(--spacing-4);
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.4);
  border-radius: var(--radius-lg);
  color: #e2e8f0;
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.control-btn:hover {
  background: rgba(99, 102, 241, 0.3);
}

.control-btn.active {
  background: rgba(99, 102, 241, 0.4);
  border-color: #818cf8;
}

.indicator-panel {
  background: rgba(30, 41, 59, 0.5);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.panel-overview h2,
.panel-detail h2 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin: 0 0 var(--spacing-4) 0;
}

.organ-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.organ-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  background: rgba(15, 23, 42, 0.5);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.2s;
}

.organ-item:hover {
  background: rgba(15, 23, 42, 0.8);
}

.organ-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.organ-name {
  flex: 1;
  font-weight: var(--font-weight-medium);
}

.indicator-count {
  font-size: var(--font-size-sm);
  color: #94a3b8;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.detail-header h2 {
  margin: 0;
}

.detail-header .organ-en {
  font-size: var(--font-size-sm);
  color: #94a3b8;
}

.indicators {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.indicator-item {
  padding: var(--spacing-3);
  background: rgba(15, 23, 42, 0.5);
  border-radius: var(--radius-lg);
  border-left: 3px solid #10B981;
}

.indicator-item.status-warning {
  border-left-color: #F59E0B;
}

.indicator-item.status-danger {
  border-left-color: #EF4444;
}

.indicator-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-2);
}

.indicator-name {
  font-weight: var(--font-weight-medium);
}

.indicator-status {
  font-size: var(--font-size-sm);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.status-normal .indicator-status {
  background: rgba(16, 185, 129, 0.2);
  color: #10B981;
}

.status-warning .indicator-status {
  background: rgba(245, 158, 11, 0.2);
  color: #F59E0B;
}

.status-danger .indicator-status {
  background: rgba(239, 68, 68, 0.2);
  color: #EF4444;
}

.indicator-value {
  margin-bottom: var(--spacing-1);
}

.indicator-value .value {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}

.indicator-value .unit {
  font-size: var(--font-size-sm);
  color: #94a3b8;
  margin-left: var(--spacing-1);
}

.indicator-range {
  font-size: var(--font-size-xs);
  color: #64748b;
  margin-bottom: var(--spacing-2);
}

.indicator-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.organ-advice {
  margin-top: var(--spacing-4);
  padding: var(--spacing-3);
  background: rgba(16, 185, 129, 0.1);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.organ-advice h4 {
  margin: 0 0 var(--spacing-2) 0;
  font-size: var(--font-size-sm);
  color: #10B981;
}

.organ-advice ul {
  margin: 0;
  padding-left: var(--spacing-5);
  font-size: var(--font-size-sm);
  color: #94a3b8;
}

.organ-advice li {
  margin-bottom: var(--spacing-1);
}

.twin-footer {
  margin-top: var(--spacing-6);
  text-align: center;
  color: #64748b;
  font-size: var(--font-size-sm);
}

@media (max-width: 1024px) {
  .twin-content {
    grid-template-columns: 1fr;
  }

  .perspective-container {
    height: 300px;
  }
}

@media (max-width: 640px) {
  .digital-twin-container {
    padding: var(--spacing-4);
  }

  .twin-header {
    flex-direction: column;
    gap: var(--spacing-3);
    text-align: center;
  }

  .organ-card {
    width: 120px;
    height: 120px;
    margin-left: -60px;
    margin-top: -60px;
  }

  .organ-visual {
    width: 60px;
    height: 60px;
  }

  .organ-icon {
    font-size: 24px;
  }
}
</style>
