import type { Intent, ExtractedEntity } from './dialog.types.js'
import { INTENT_PATTERNS } from './dialog.types.js'

export class IntentRecognizer {
  private symptomKeywords = [
    '头痛', '头晕', '发热', '发烧', '咳嗽', '流鼻涕', '鼻塞', '咽喉痛',
    '腹痛', '胃痛', '恶心', '呕吐', '腹泻', '便秘', '胸闷', '心悸',
    '乏力', '疲劳', '失眠', '嗜睡', '皮疹', '瘙痒', '关节痛', '肌肉痛',
    '腰痛', '背痛', '腿痛', '手臂痛', '麻木', '抽筋', '水肿', '出血'
  ]

  private drugKeywords = [
    '阿司匹林', '布洛芬', '对乙酰氨基酚', '感冒药', '消炎药', '抗生素',
    '降压药', '降糖药', '止痛药', '退烧药', '止咳药', '胃药', '维生素',
    '钙片', '中药', '片剂', '胶囊', '口服液', '注射剂', '药丸', '药'
  ]

  private examinationKeywords = [
    '血常规', '尿常规', '肝功能', '肾功能', '血糖', '血脂', '血压',
    '心电图', 'CT', 'X光', 'B超', '核磁共振', '胃镜', '肠镜', '检查',
    '化验', '体检', '检测', '扫描', '造影'
  ]

  private diseaseKeywords = [
    '感冒', '高血压', '糖尿病', '胃炎', '肺炎', '支气管炎', '哮喘',
    '冠心病', '心脏病', '肝病', '肾病', '贫血', '痛风', '湿疹', '过敏',
    '失眠', '抑郁症', '焦虑症', '颈椎病', '腰椎病', '关节炎', '癌症'
  ]

  private bodyPartKeywords = [
    '头', '眼睛', '耳朵', '鼻子', '喉咙', '颈部', '胸部', '腹部',
    '背部', '腰部', '手臂', '手', '腿', '脚', '心脏', '肺', '肝',
    '胃', '肾', '肠道', '皮肤', '关节'
  ]

  private durationPatterns = [
    { pattern: /(\d+)\s*天/, unit: '天' },
    { pattern: /(\d+)\s*周/, unit: '周' },
    { pattern: /(\d+)\s*个月/, unit: '月' },
    { pattern: /(\d+)\s*年/, unit: '年' },
    { pattern: /(\d+)\s*小时/, unit: '小时' },
    { pattern: /昨天|前天|大前天/, unit: '天' },
    { pattern: /上周|上个月/, unit: '周' },
    { pattern: /最近|这几天|这段时间/, unit: '近期' }
  ]

  private severityKeywords = {
    mild: ['轻微', '有点', '稍微', '一点', '不太严重'],
    moderate: ['中等', '一般', '还好', '比较'],
    severe: ['严重', '很', '非常', '特别', '剧烈', '难以忍受']
  }

  recognizeIntent(text: string): {
    intent: Intent
    confidence: number
    entities: ExtractedEntity[]
  } {
    const entities = this.extractEntities(text)
    const intent = this.classifyIntent(text, entities)
    const confidence = this.calculateConfidence(text, intent, entities)

    return { intent, confidence, entities }
  }

  private classifyIntent(text: string, entities: ExtractedEntity[]): Intent {
    const lowerText = text.toLowerCase()

    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (lowerText.includes(pattern.toLowerCase())) {
          if (intent !== 'unknown') {
            return intent as Intent
          }
        }
      }
    }

    const hasSymptom = entities.some(e => e.type === 'symptom')
    const hasDrug = entities.some(e => e.type === 'drug')
    const hasExamination = entities.some(e => e.type === 'examination')
    const hasDisease = entities.some(e => e.type === 'disease')

    if (hasSymptom && text.includes('什么')) {
      return 'diagnosis_request'
    }

    if (hasSymptom) {
      return 'symptom_report'
    }

    if (hasDrug) {
      return 'drug_inquiry'
    }

    if (hasExamination) {
      return 'examination_inquiry'
    }

    if (hasDisease && (text.includes('治疗') || text.includes('怎么治'))) {
      return 'treatment_inquiry'
    }

    if (hasDisease) {
      return 'health_consultation'
    }

    if (text.includes('症状') || text.includes('不舒服')) {
      return 'symptom_report'
    }

    return 'general_question'
  }

  extractEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = []

    this.symptomKeywords.forEach(keyword => {
      const index = text.indexOf(keyword)
      if (index !== -1) {
        entities.push({
          type: 'symptom',
          value: keyword,
          confidence: 0.9,
          start: index,
          end: index + keyword.length
        })
      }
    })

    this.drugKeywords.forEach(keyword => {
      const index = text.indexOf(keyword)
      if (index !== -1) {
        entities.push({
          type: 'drug',
          value: keyword,
          confidence: 0.9,
          start: index,
          end: index + keyword.length
        })
      }
    })

    this.examinationKeywords.forEach(keyword => {
      const index = text.indexOf(keyword)
      if (index !== -1) {
        entities.push({
          type: 'examination',
          value: keyword,
          confidence: 0.9,
          start: index,
          end: index + keyword.length
        })
      }
    })

    this.diseaseKeywords.forEach(keyword => {
      const index = text.indexOf(keyword)
      if (index !== -1) {
        entities.push({
          type: 'disease',
          value: keyword,
          confidence: 0.85,
          start: index,
          end: index + keyword.length
        })
      }
    })

    this.bodyPartKeywords.forEach(keyword => {
      const index = text.indexOf(keyword)
      if (index !== -1) {
        entities.push({
          type: 'body_part',
          value: keyword,
          confidence: 0.8,
          start: index,
          end: index + keyword.length
        })
      }
    })

    this.durationPatterns.forEach(({ pattern, unit }) => {
      const match = text.match(pattern)
      if (match) {
        entities.push({
          type: 'duration',
          value: match[0],
          confidence: 0.95,
          start: match.index!,
          end: match.index! + match[0].length
        })
      }
    })

    Object.entries(this.severityKeywords).forEach(([severity, keywords]) => {
      keywords.forEach(keyword => {
        const index = text.indexOf(keyword)
        if (index !== -1) {
          entities.push({
            type: 'severity',
            value: severity,
            confidence: 0.85,
            start: index,
            end: index + keyword.length
          })
        }
      })
    })

    const agePattern = /(\d+)\s*岁/
    const ageMatch = text.match(agePattern)
    if (ageMatch) {
      entities.push({
        type: 'age',
        value: ageMatch[1],
        confidence: 0.95,
        start: ageMatch.index!,
        end: ageMatch.index! + ageMatch[0].length
      })
    }

    return this.deduplicateEntities(entities)
  }

  private deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const seen = new Set<string>()
    return entities.filter(entity => {
      const key = `${entity.type}:${entity.value}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private calculateConfidence(
    text: string,
    intent: Intent,
    entities: ExtractedEntity[]
  ): number {
    let confidence = 0.5

    if (entities.length > 0) {
      confidence += 0.2
    }

    if (entities.length > 2) {
      confidence += 0.1
    }

    const avgEntityConfidence = entities.length > 0
      ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length
      : 0
    confidence = confidence * 0.7 + avgEntityConfidence * 0.3

    if (intent === 'unknown') {
      confidence *= 0.5
    }

    return Math.min(confidence, 1)
  }

  getIntentDescription(intent: Intent): string {
    const descriptions: Record<Intent, string> = {
      health_consultation: '健康咨询',
      symptom_report: '症状报告',
      diagnosis_request: '诊断请求',
      treatment_inquiry: '治疗咨询',
      drug_inquiry: '药品咨询',
      examination_inquiry: '检查咨询',
      general_question: '一般问题',
      clarification: '澄清说明',
      confirmation: '确认',
      denial: '否认',
      greeting: '问候',
      farewell: '告别',
      thanks: '感谢',
      unknown: '未知意图'
    }
    return descriptions[intent]
  }
}
