<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import Button from '@/components/base/Button.vue'
import IconStar from '@/components/icons/IconStar.vue'

const emit = defineEmits<{
  submit: [result: CustomSurveyResult]
}>()

interface CustomSurveyResult {
  accuracy: number
  usefulness: number
  explainability: number
  nps: number
  comparison: string
  suggestions: string
  submittedAt: string
}

const formData = reactive({
  accuracy: 0,
  usefulness: 0,
  explainability: 0,
  nps: 0,
  comparison: '',
  suggestions: ''
})

const isSubmitted = ref(false)

const isValid = computed(() => {
  return formData.accuracy > 0 &&
         formData.usefulness > 0 &&
         formData.explainability > 0 &&
         formData.nps > 0 &&
         formData.comparison.length > 0
})

const ratingQuestions = [
  { key: 'accuracy', label: '回答准确性', desc: '系统提供的医疗信息准确程度' },
  { key: 'usefulness', label: '回答有用性', desc: '系统回答对您解决健康问题的帮助程度' },
  { key: 'explainability', label: '可解释性帮助', desc: '来源溯源功能对您理解回答的帮助程度' }
]

const comparisonOptions = [
  { value: 'much_better', label: '好很多' },
  { value: 'better', label: '稍好一些' },
  { value: 'same', label: '差不多' },
  { value: 'worse', label: '稍差一些' },
  { value: 'much_worse', label: '差很多' },
  { value: 'no_experience', label: '未使用过其他产品' }
]

const setRating = (key: string, value: number) => {
  (formData as any)[key] = value
}

const getNPSLabel = (score: number): string => {
  if (score >= 9) return '推荐者'
  if (score >= 7) return '被动者'
  return '贬损者'
}

const getNPSColor = (score: number): string => {
  if (score >= 9) return 'var(--color-success)'
  if (score >= 7) return 'var(--color-warning)'
  return 'var(--color-error)'
}

const submitSurvey = () => {
  if (!isValid.value) return
  
  isSubmitted.value = true
  const result: CustomSurveyResult = {
    accuracy: formData.accuracy,
    usefulness: formData.usefulness,
    explainability: formData.explainability,
    nps: formData.nps,
    comparison: formData.comparison,
    suggestions: formData.suggestions,
    submittedAt: new Date().toISOString()
  }
  emit('submit', result)
}
</script>

<template>
  <div class="custom-survey">
    <div v-if="!isSubmitted" class="survey-content">
      <div class="rating-section">
        <div
          v-for="question in ratingQuestions"
          :key="question.key"
          class="rating-item"
        >
          <div class="rating-header">
            <span class="rating-label">{{ question.label }}</span>
            <span class="rating-desc">{{ question.desc }}</span>
          </div>
          <div class="rating-stars">
            <button
              v-for="n in 5"
              :key="n"
              class="star-btn"
              :class="{ active: (formData as any)[question.key] >= n }"
              @click="setRating(question.key, n)"
            >
              <IconStar />
            </button>
            <span class="rating-value">{{ (formData as any)[question.key] || '-' }}/5</span>
          </div>
        </div>
      </div>

      <div class="nps-section">
        <div class="nps-header">
          <span class="nps-label">您有多大可能向朋友推荐本系统？</span>
          <span class="nps-desc">(0=完全不可能，10=非常可能)</span>
        </div>
        <div class="nps-scale">
          <button
            v-for="n in 11"
            :key="n - 1"
            class="nps-btn"
            :class="{ 
              active: formData.nps === n - 1,
              promoter: formData.nps >= 9 && formData.nps === n - 1,
              passive: formData.nps >= 7 && formData.nps < 9 && formData.nps === n - 1,
              detractor: formData.nps < 7 && formData.nps === n - 1
            }"
            @click="formData.nps = n - 1"
          >
            {{ n - 1 }}
          </button>
        </div>
        <div v-if="formData.nps > 0" class="nps-result">
          <span :style="{ color: getNPSColor(formData.nps) }">
            {{ getNPSLabel(formData.nps) }}
          </span>
        </div>
      </div>

      <div class="comparison-section">
        <label class="comparison-label">与百度健康、阿里健康等产品相比，您认为本系统如何？</label>
        <div class="comparison-options">
          <label
            v-for="option in comparisonOptions"
            :key="option.value"
            class="comparison-option"
            :class="{ selected: formData.comparison === option.value }"
          >
            <input
              type="radio"
              :value="option.value"
              v-model="formData.comparison"
            />
            <span>{{ option.label }}</span>
          </label>
        </div>
      </div>

      <div class="suggestions-section">
        <label class="suggestions-label">您对系统有什么改进建议？</label>
        <textarea
          v-model="formData.suggestions"
          placeholder="请输入您的建议..."
          rows="4"
        ></textarea>
      </div>

      <div class="submit-section">
        <Button
          variant="primary"
          size="lg"
          :disabled="!isValid"
          @click="submitSurvey"
        >
          提交问卷
        </Button>
      </div>
    </div>

    <div v-else class="survey-result">
      <div class="result-icon">✓</div>
      <h4 class="result-title">感谢您的宝贵意见！</h4>
      <p class="result-desc">您的反馈将帮助我们持续改进产品</p>
    </div>
  </div>
</template>

<style scoped>
.custom-survey {
  text-align: center;
}

.survey-content {
  text-align: left;
}

.rating-section {
  margin-bottom: var(--spacing-6);
}

.rating-item {
  padding: var(--spacing-4);
  background: var(--color-bg-primary);
  border-radius: var(--radius-xl);
  margin-bottom: var(--spacing-3);
}

.rating-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-3);
}

.rating-label {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  letter-spacing: var(--letter-spacing-normal);
}

.rating-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  letter-spacing: var(--letter-spacing-caption);
}

.rating-stars {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.star-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-border);
  transition: all var(--transition-fast);
}

.star-btn:hover,
.star-btn.active {
  color: var(--color-warning);
  transform: scale(1.1);
}

.star-btn :deep(svg) {
  width: 100%;
  height: 100%;
}

.rating-value {
  margin-left: var(--spacing-4);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
  letter-spacing: var(--letter-spacing-normal);
}

.nps-section {
  padding: var(--spacing-4);
  background: var(--color-bg-primary);
  border-radius: var(--radius-xl);
  margin-bottom: var(--spacing-6);
}

.nps-header {
  margin-bottom: var(--spacing-3);
}

.nps-label {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  letter-spacing: var(--letter-spacing-normal);
}

.nps-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-left: var(--spacing-2);
  letter-spacing: var(--letter-spacing-caption);
}

.nps-scale {
  display: flex;
  gap: var(--spacing-1);
}

.nps-btn {
  flex: 1;
  height: 40px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-fast);
  letter-spacing: var(--letter-spacing-normal);
}

.nps-btn:hover {
  border-color: var(--color-primary);
}

.nps-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary-gradient);
  color: var(--color-text-inverse);
}

.nps-btn.promoter {
  background: var(--color-success);
  border-color: var(--color-success);
}

.nps-btn.passive {
  background: var(--color-warning);
  border-color: var(--color-warning);
}

.nps-btn.detractor {
  background: var(--color-error);
  border-color: var(--color-error);
}

.nps-result {
  text-align: center;
  margin-top: var(--spacing-2);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-normal);
}

.comparison-section {
  margin-bottom: var(--spacing-6);
}

.comparison-label {
  display: block;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-3);
  letter-spacing: var(--letter-spacing-normal);
}

.comparison-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.comparison-option {
  display: flex;
  align-items: center;
  padding: var(--spacing-2) var(--spacing-4);
  background: var(--color-bg-primary);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
  letter-spacing: var(--letter-spacing-normal);
}

.comparison-option:hover {
  border-color: var(--color-primary);
}

.comparison-option.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.comparison-option input {
  display: none;
}

.suggestions-section {
  margin-bottom: var(--spacing-6);
}

.suggestions-label {
  display: block;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-3);
  letter-spacing: var(--letter-spacing-normal);
}

.suggestions-section textarea {
  width: 100%;
  padding: var(--spacing-3);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-xl);
  font-size: var(--font-size-base);
  font-family: inherit;
  resize: vertical;
  transition: border-color var(--transition-fast);
  background: var(--color-surface);
  color: var(--color-text-primary);
  letter-spacing: var(--letter-spacing-normal);
}

.suggestions-section textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.suggestions-section textarea::placeholder {
  color: var(--color-text-tertiary);
}

.submit-section {
  text-align: center;
}

.survey-result {
  text-align: center;
  padding: var(--spacing-8) 0;
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
  font-size: 32px;
}

.result-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-2) 0;
  letter-spacing: var(--letter-spacing-headline);
}

.result-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
  letter-spacing: var(--letter-spacing-normal);
}

@media (max-width: 480px) {
  .rating-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-1);
  }

  .nps-scale {
    flex-wrap: wrap;
  }

  .nps-btn {
    flex: 0 0 calc(20% - 4px);
  }

  .comparison-options {
    flex-direction: column;
  }

  .comparison-option {
    width: 100%;
  }
}
</style>
