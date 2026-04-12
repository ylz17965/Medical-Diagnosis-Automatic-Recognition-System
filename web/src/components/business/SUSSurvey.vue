<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from '@/components/base/Button.vue'
import IconCheck from '@/components/icons/IconCheck.vue'

const emit = defineEmits<{
  submit: [result: SUSResult]
}>()

interface SUSResult {
  susScore: number
  adjectiveRating: string
  responses: number[]
  submittedAt: string
}

const questions = [
  '我认为我会经常使用这个系统',
  '我发现这个系统不必要地复杂',
  '我认为这个系统很容易使用',
  '我需要技术人员的帮助才能使用这个系统',
  '我发现系统的各项功能整合得很好',
  '我认为这个系统中有太多不一致的地方',
  '我想大多数人会很快学会使用这个系统',
  '我发现这个系统使用起来非常繁琐',
  '在使用这个系统时，我感到非常自信',
  '在使用这个系统之前，我需要学习很多东西'
]

const responses = ref<number[]>(Array(10).fill(0))
const currentQuestion = ref(0)
const isSubmitted = ref(false)

const isValid = computed(() => {
  return responses.value.every(r => r >= 1 && r <= 5)
})

const calculateSUSScore = (): number => {
  let sum = 0
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) {
      sum += responses.value[i] - 1
    } else {
      sum += 5 - responses.value[i]
    }
  }
  return sum * 2.5
}

const getAdjectiveRating = (score: number): string => {
  if (score >= 85) return '优秀'
  if (score >= 72) return '良好'
  if (score >= 52) return '一般'
  if (score >= 32) return '较差'
  return '差'
}

const setResponse = (value: number) => {
  responses.value[currentQuestion.value] = value
  if (currentQuestion.value < 9) {
    setTimeout(() => {
      currentQuestion.value++
    }, 200)
  }
}

const nextQuestion = () => {
  if (currentQuestion.value < 9) {
    currentQuestion.value++
  }
}

const prevQuestion = () => {
  if (currentQuestion.value > 0) {
    currentQuestion.value--
  }
}

const submitSUS = () => {
  if (!isValid.value) return
  
  isSubmitted.value = true
  const result: SUSResult = {
    susScore: calculateSUSScore(),
    adjectiveRating: getAdjectiveRating(calculateSUSScore()),
    responses: [...responses.value],
    submittedAt: new Date().toISOString()
  }
  emit('submit', result)
}

const progress = computed(() => {
  const answered = responses.value.filter(r => r > 0).length
  return Math.round((answered / 10) * 100)
})
</script>

<template>
  <div class="sus-survey">
    <div v-if="!isSubmitted" class="survey-content">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        <span class="progress-text">{{ progress }}%</span>
      </div>

      <div class="question-card">
        <div class="question-number">问题 {{ currentQuestion + 1 }} / 10</div>
        <div class="question-text">{{ questions[currentQuestion] }}</div>
        
        <div class="rating-scale">
          <div class="scale-labels">
            <span>非常不同意</span>
            <span>非常同意</span>
          </div>
          <div class="scale-options">
            <button
              v-for="n in 5"
              :key="n"
              class="scale-btn"
              :class="{ active: responses[currentQuestion] === n }"
              @click="setResponse(n)"
            >
              {{ n }}
            </button>
          </div>
        </div>
      </div>

      <div class="navigation">
        <Button
          variant="secondary"
          :disabled="currentQuestion === 0"
          @click="prevQuestion"
        >
          上一题
        </Button>
        <Button
          v-if="currentQuestion < 9"
          variant="primary"
          :disabled="responses[currentQuestion] === 0"
          @click="nextQuestion"
        >
          下一题
        </Button>
        <Button
          v-else
          variant="primary"
          :disabled="!isValid"
          @click="submitSUS"
        >
          提交
        </Button>
      </div>
    </div>

    <div v-else class="survey-result">
      <div class="result-icon">
        <IconCheck />
      </div>
      <h4 class="result-title">感谢您的反馈！</h4>
      <div class="score-display">
        <div class="score-value">{{ calculateSUSScore() }}</div>
        <div class="score-label">SUS评分 (满分100)</div>
        <div class="score-rating" :class="`rating-${getAdjectiveRating(calculateSUSScore())}`">
          {{ getAdjectiveRating(calculateSUSScore()) }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sus-survey {
  text-align: center;
}

.survey-content {
  text-align: left;
}

.progress-bar {
  height: 6px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  margin-bottom: var(--spacing-6);
  position: relative;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary-gradient);
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
}

.progress-text {
  position: absolute;
  right: 0;
  top: -20px;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: var(--font-weight-medium);
  letter-spacing: var(--letter-spacing-caption);
}

.question-card {
  background: var(--color-bg-primary);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  margin-bottom: var(--spacing-6);
}

.question-number {
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-2);
  letter-spacing: var(--letter-spacing-caption);
}

.question-text {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-6);
  line-height: var(--line-height-headline);
  letter-spacing: var(--letter-spacing-normal);
}

.rating-scale {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.scale-labels {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  letter-spacing: var(--letter-spacing-caption);
}

.scale-options {
  display: flex;
  justify-content: center;
  gap: var(--spacing-3);
}

.scale-btn {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  letter-spacing: var(--letter-spacing-normal);
}

.scale-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.scale-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary-gradient);
  color: var(--color-text-inverse);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.25);
}

.navigation {
  display: flex;
  justify-content: center;
  gap: var(--spacing-4);
}

.survey-result {
  text-align: center;
  padding: var(--spacing-6) 0;
}

.result-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-full);
  background: var(--color-success-bg);
  color: var(--color-success);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--spacing-4);
}

.result-icon :deep(svg) {
  width: 32px;
  height: 32px;
}

.result-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-6) 0;
  letter-spacing: var(--letter-spacing-headline);
}

.score-display {
  background: var(--color-bg-primary);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  max-width: 200px;
  margin: 0 auto;
}

.score-value {
  font-size: 48px;
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: var(--spacing-1);
  letter-spacing: var(--letter-spacing-title1);
}

.score-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-3);
  letter-spacing: var(--letter-spacing-normal);
}

.score-rating {
  display: inline-block;
  padding: var(--spacing-1) var(--spacing-4);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-normal);
}

.score-rating.rating-优秀 {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.score-rating.rating-良好 {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.score-rating.rating-一般 {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.score-rating.rating-较差,
.score-rating.rating-差 {
  background: var(--color-error-bg);
  color: var(--color-error);
}

@media (max-width: 480px) {
  .scale-options {
    gap: var(--spacing-2);
  }

  .scale-btn {
    width: 40px;
    height: 40px;
    font-size: var(--font-size-base);
  }
}
</style>
