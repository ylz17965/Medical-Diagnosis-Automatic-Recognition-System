<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { MainLayout } from '@/layouts'

const router = useRouter()

const stats = ref({
  totalUsers: 12580,
  totalConsultations: 45623,
  todayConsultations: 386,
  avgResponseTime: 1.2,
  satisfactionRate: 96.8,
  activeHospitals: 12
})

const consultationTrend = ref<number[]>([])
const diseaseDistribution = ref([
  { name: '呼吸系统', value: 28, color: '#10B981' },
  { name: '心血管系统', value: 24, color: '#EF4444' },
  { name: '消化系统', value: 18, color: '#F59E0B' },
  { name: '内分泌系统', value: 15, color: '#8B5CF6' },
  { name: '其他', value: 15, color: '#6B7280' }
])

const recentActivities = ref([
  { time: '14:32', action: '肺癌早筛评估', result: '低风险' },
  { time: '14:28', action: '血压分析', result: '正常高值' },
  { time: '14:25', action: '健康咨询', result: '已完成' },
  { time: '14:20', action: '报告解读', result: '已生成' },
  { time: '14:15', action: '用药咨询', result: '已回复' }
])

const currentTime = ref(new Date().toLocaleString('zh-CN'))

let timeInterval: ReturnType<typeof setInterval>
let trendInterval: ReturnType<typeof setInterval>

onMounted(() => {
  timeInterval = setInterval(() => {
    currentTime.value = new Date().toLocaleString('zh-CN')
  }, 1000)

  for (let i = 0; i < 24; i++) {
    consultationTrend.value.push(Math.floor(Math.random() * 100) + 50)
  }

  trendInterval = setInterval(() => {
    consultationTrend.value.shift()
    consultationTrend.value.push(Math.floor(Math.random() * 100) + 50)
    stats.value.todayConsultations += Math.floor(Math.random() * 3)
  }, 3000)
})

onUnmounted(() => {
  clearInterval(timeInterval)
  clearInterval(trendInterval)
})

const maxTrend = (arr: number[]) => Math.max(...arr, 1)
</script>

<template>
  <MainLayout>
    <div class="dashboard">
      <header class="dashboard-header">
        <button class="back-btn" @click="router.push('/')" aria-label="返回首页">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 class="dashboard-title">AI智能医疗服务平台 · 数据大屏</h1>
        <div class="dashboard-time">{{ currentTime }}</div>
      </header>

    <div class="dashboard-content">
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon users"></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalUsers.toLocaleString() }}</div>
            <div class="stat-label">累计用户</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon consultations"></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalConsultations.toLocaleString() }}</div>
            <div class="stat-label">累计咨询</div>
          </div>
        </div>
        <div class="stat-card highlight">
          <div class="stat-icon today"></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.todayConsultations }}</div>
            <div class="stat-label">今日咨询</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon response"></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.avgResponseTime }}s</div>
            <div class="stat-label">平均响应</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon satisfaction"></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.satisfactionRate }}%</div>
            <div class="stat-label">满意度</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon hospitals"></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.activeHospitals }}</div>
            <div class="stat-label">合作医院</div>
          </div>
        </div>
      </div>

      <div class="charts-row">
        <div class="chart-card large">
          <div class="chart-header">
            <h3>24小时咨询趋势</h3>
          </div>
          <div class="chart-body">
            <div class="trend-chart">
              <div 
                v-for="(value, index) in consultationTrend" 
                :key="index"
                class="trend-bar"
                :style="{ height: `${(value / maxTrend(consultationTrend)) * 100}%` }"
              >
                <span class="trend-value">{{ value }}</span>
              </div>
            </div>
            <div class="trend-labels">
              <span v-for="i in 24" :key="i">{{ i === 1 || i === 6 || i === 12 || i === 18 || i === 24 ? `${i}:00` : '' }}</span>
            </div>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <h3>疾病分布</h3>
          </div>
          <div class="chart-body">
            <div class="pie-chart">
              <div class="pie-visual">
                <svg viewBox="0 0 100 100">
                  <circle 
                    v-for="(item, index) in diseaseDistribution" 
                    :key="index"
                    cx="50" 
                    cy="50" 
                    r="40"
                    fill="none"
                    :stroke="item.color"
                    stroke-width="20"
                    :stroke-dasharray="`${item.value * 2.51} ${251 - item.value * 2.51}`"
                    :stroke-dashoffset="-diseaseDistribution.slice(0, index).reduce((sum, i) => sum + i.value * 2.51, 0)"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
              </div>
              <div class="pie-legend">
                <div v-for="(item, index) in diseaseDistribution" :key="index" class="legend-item">
                  <span class="legend-color" :style="{ backgroundColor: item.color }"></span>
                  <span class="legend-name">{{ item.name }}</span>
                  <span class="legend-value">{{ item.value }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <h3>实时动态</h3>
          </div>
          <div class="chart-body">
            <div class="activity-list">
              <div v-for="(activity, index) in recentActivities" :key="index" class="activity-item">
                <span class="activity-time">{{ activity.time }}</span>
                <span class="activity-action">{{ activity.action }}</span>
                <span class="activity-result">{{ activity.result }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="features-row">
        <div class="feature-card">
          <div class="feature-icon lung"></div>
          <h4>肺癌早筛</h4>
          <p>基于Fleischner 2025指南</p>
          <div class="feature-stat">
            <span class="feature-value">2,845</span>
            <span class="feature-label">次评估</span>
          </div>
        </div>
        <div class="feature-card">
          <div class="feature-icon heart"></div>
          <h4>高血压管理</h4>
          <p>智能血压分析与用药建议</p>
          <div class="feature-stat">
            <span class="feature-value">5,234</span>
            <span class="feature-label">次分析</span>
          </div>
        </div>
        <div class="feature-card">
          <div class="feature-icon report"></div>
          <h4>报告解读</h4>
          <p>体检报告智能分析</p>
          <div class="feature-stat">
            <span class="feature-value">8,127</span>
            <span class="feature-label">份报告</span>
          </div>
        </div>
        <div class="feature-card">
          <div class="feature-icon search"></div>
          <h4>深度搜索</h4>
          <p>权威医学资料检索</p>
          <div class="feature-stat">
            <span class="feature-value">12,456</span>
            <span class="feature-label">次搜索</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  </MainLayout>
</template>

<style scoped>
.dashboard {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
  color: #fff;
}

.dashboard-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-4) var(--spacing-6);
  background: rgba(30, 41, 59, 0.8);
  border-radius: var(--radius-xl);
  margin-bottom: var(--spacing-6);
  border: 1px solid rgba(99, 102, 241, 0.3);
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

.dashboard-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  background: linear-gradient(90deg, #818cf8, #c084fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.dashboard-time {
  font-size: var(--font-size-lg);
  color: #94a3b8;
  font-family: monospace;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-6);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  background: rgba(30, 41, 59, 0.6);
  border-radius: var(--radius-xl);
  border: 1px solid rgba(99, 102, 241, 0.2);
  transition: all var(--transition-normal);
}

.stat-card:hover {
  border-color: rgba(99, 102, 241, 0.5);
  transform: translateY(-2px);
}

.stat-card.highlight {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
  border-color: rgba(99, 102, 241, 0.5);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.users { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
.stat-icon.consultations { background: linear-gradient(135deg, #10b981, #059669); }
.stat-icon.today { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
.stat-icon.response { background: linear-gradient(135deg, #f59e0b, #d97706); }
.stat-icon.satisfaction { background: linear-gradient(135deg, #ec4899, #db2777); }
.stat-icon.hospitals { background: linear-gradient(135deg, #06b6d4, #0891b2); }

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  line-height: 1.2;
}

.stat-label {
  font-size: var(--font-size-sm);
  color: #94a3b8;
  margin-top: var(--spacing-1);
}

.charts-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-6);
}

.chart-card {
  background: rgba(30, 41, 59, 0.6);
  border-radius: var(--radius-xl);
  border: 1px solid rgba(99, 102, 241, 0.2);
  overflow: hidden;
}

.chart-card.large {
  grid-column: span 1;
}

.chart-header {
  padding: var(--spacing-3) var(--spacing-4);
  border-bottom: 1px solid rgba(99, 102, 241, 0.2);
}

.chart-header h3 {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: #e2e8f0;
}

.chart-body {
  padding: var(--spacing-4);
}

.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 180px;
}

.trend-bar {
  flex: 1;
  background: linear-gradient(180deg, #818cf8, #4f46e5);
  border-radius: 2px 2px 0 0;
  position: relative;
  min-height: 4px;
  transition: height 0.3s ease;
}

.trend-bar:hover {
  background: linear-gradient(180deg, #a5b4fc, #818cf8);
}

.trend-bar .trend-value {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: #94a3b8;
  opacity: 0;
  transition: opacity 0.2s;
}

.trend-bar:hover .trend-value {
  opacity: 1;
}

.trend-labels {
  display: flex;
  justify-content: space-between;
  margin-top: var(--spacing-2);
  font-size: 10px;
  color: #64748b;
}

.pie-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-4);
}

.pie-visual {
  width: 120px;
  height: 120px;
}

.pie-visual svg {
  transform: rotate(0deg);
}

.pie-legend {
  width: 100%;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-1) 0;
  font-size: var(--font-size-sm);
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-name {
  flex: 1;
  color: #94a3b8;
}

.legend-value {
  color: #e2e8f0;
  font-weight: var(--font-weight-medium);
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.activity-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-2);
  background: rgba(15, 23, 42, 0.5);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}

.activity-time {
  color: #64748b;
  font-family: monospace;
  width: 50px;
}

.activity-action {
  flex: 1;
  color: #e2e8f0;
}

.activity-result {
  color: #10b981;
  font-size: var(--font-size-xs);
}

.features-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-4);
}

.feature-card {
  padding: var(--spacing-4);
  background: rgba(30, 41, 59, 0.6);
  border-radius: var(--radius-xl);
  border: 1px solid rgba(99, 102, 241, 0.2);
  text-align: center;
  transition: all var(--transition-normal);
}

.feature-card:hover {
  border-color: rgba(99, 102, 241, 0.5);
  transform: translateY(-4px);
}

.feature-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto var(--spacing-3);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-icon.lung { background: linear-gradient(135deg, #10b981, #059669); }
.feature-icon.heart { background: linear-gradient(135deg, #ef4444, #dc2626); }
.feature-icon.report { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
.feature-icon.search { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }

.feature-card h4 {
  margin: 0 0 var(--spacing-1) 0;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}

.feature-card p {
  margin: 0 0 var(--spacing-3) 0;
  font-size: var(--font-size-sm);
  color: #94a3b8;
}

.feature-stat {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: var(--spacing-1);
}

.feature-value {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: #818cf8;
}

.feature-label {
  font-size: var(--font-size-sm);
  color: #64748b;
}

@media (max-width: 1200px) {
  .stats-row {
    grid-template-columns: repeat(3, 1fr);
  }

  .charts-row {
    grid-template-columns: 1fr 1fr;
  }

  .chart-card.large {
    grid-column: span 2;
  }

  .features-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard {
    padding: var(--spacing-4);
  }

  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-row {
    grid-template-columns: 1fr;
  }

  .chart-card.large {
    grid-column: span 1;
  }

  .features-row {
    grid-template-columns: 1fr;
  }

  .dashboard-header {
    flex-direction: column;
    gap: var(--spacing-2);
    text-align: center;
  }
}
</style>
