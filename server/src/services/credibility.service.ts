import authoritativeSources from '../data/authoritative_sources.json' with { type: 'json' }
import followupRules from '../data/followup_rules.json' with { type: 'json' }
import systemPromptConfig from '../data/system_prompt_config.json' with { type: 'json' }

interface FollowUpResult {
  needsFollowUp: boolean
  questions: string[]
  ruleId?: string
  ruleName?: string
  purpose?: string
}

interface SourceAnnotation {
  topic: string
  source: string
  citation: string
  timeSensitivity?: {
    isTimeSensitive: boolean
    reminderText?: string
  }
}

interface SessionState {
  hasChronicDisease: boolean
  chronicDiseaseType?: string
  hasAllergy: boolean
  allergyDetails?: string
  currentMedications?: string[]
  ageGroup?: 'child' | 'adult' | 'elderly'
  pregnancyStatus?: boolean
  symptomDetails?: Map<string, any>
  askedQuestions: Set<string>
}

class CredibilityService {
  private sessionStates: Map<string, SessionState> = new Map()

  getSystemPrompt(): string {
    const config = systemPromptConfig.systemPrompt
    const parts: string[] = [
      config.baseIdentity,
      '',
      '## 核心规则',
      '',
      '### 可信性铁律',
      ...config.coreRules.credibility.rules.map((r: string, i: number) => `${i + 1}. ${r}`),
      '',
      '### 交互性铁律',
      ...config.coreRules.interactivity.rules.map((r: string, i: number) => `${i + 1}. ${r}`),
      '',
      '### 安全性铁律',
      ...config.coreRules.safety.rules.map((r: string, i: number) => `${i + 1}. ${r}`),
      '',
      '## 禁止事项',
      ...config.prohibitedActions.map((a: string, i: number) => `${i + 1}. ${a}`),
      '',
      '## 回应结构',
      `- 问候语：${config.responseStructure.greeting}`,
      `- 追问开场：${config.responseStructure.followUpOpening}`,
      `- 就医边界提示：${config.responseStructure.medicalBoundaryWarning}`,
      `- 免责声明：${config.responseStructure.disclaimer}`,
      '',
      '## 语气风格',
      `- 风格：${config.tone.style}`,
      `- 同理心：${config.tone.empathy}`,
      `- 清晰度：${config.tone.clarity}`,
      `- 诚实度：${config.tone.honesty}`,
    ]

    return parts.join('\n')
  }

  analyzeFollowUpNeed(userInput: string, sessionId: string): FollowUpResult {
    const state = this.getOrCreateSession(sessionId)
    const input = userInput.toLowerCase()
    
    const sortedRules = [...followupRules.followUpRules].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]
    })

    for (const rule of sortedRules) {
      if (this.checkRuleTrigger(rule, input, state)) {
        const unansweredQuestions = rule.questions.filter((q: string) => {
          const questionKey = `${rule.id}_${q}`
          return !state.askedQuestions.has(questionKey)
        })

        if (unansweredQuestions.length > 0) {
          unansweredQuestions.forEach((q: string) => {
            const questionKey = `${rule.id}_${q}`
            state.askedQuestions.add(questionKey)
          })

          return {
            needsFollowUp: true,
            questions: unansweredQuestions.slice(0, 2),
            ruleId: rule.id,
            ruleName: rule.name,
            purpose: rule.purpose
          }
        }
      }
    }

    return { needsFollowUp: false, questions: [] }
  }

  private checkRuleTrigger(rule: any, input: string, state: SessionState): boolean {
    const triggers = rule.triggers
    
    if (triggers.keywords) {
      const hasKeyword = triggers.keywords.some((k: string) => input.includes(k.toLowerCase()))
      if (!hasKeyword) return false
    }

    if (triggers.symptomKeywords && !triggers.symptomKeywords.some((k: string) => input.includes(k.toLowerCase()))) {
      return false
    }

    if (rule.id === 'chronic_disease_symptom') {
      const chronicKeywords = ['糖尿病', '高血压', '心脏病', '肾病', '肝病', '哮喘']
      const symptomKeywords = ['感冒', '发烧', '咳嗽', '头痛', '胃不舒服']
      const hasChronic = chronicKeywords.some(k => input.includes(k))
      const hasSymptom = symptomKeywords.some(k => input.includes(k))
      return hasChronic && hasSymptom
    }

    return true
  }

  findRelevantSources(userInput: string): SourceAnnotation[] {
    const input = userInput.toLowerCase()
    const relevantSources: SourceAnnotation[] = []

    for (const topic of authoritativeSources.topics) {
      const isRelevant = topic.keywords.some((k: string) => input.includes(k.toLowerCase()))
      
      if (isRelevant) {
        const primarySource = topic.sources[0]
        relevantSources.push({
          topic: topic.name,
          source: primarySource.name,
          citation: primarySource.citation,
          timeSensitivity: topic.timeSensitivity
        })
      }
    }

    return relevantSources
  }

  formatSourceAnnotation(source: SourceAnnotation): string {
    let annotation = `（依据${source.citation}）`
    
    if (source.timeSensitivity?.isTimeSensitive && source.timeSensitivity.reminderText) {
      annotation += `\n${source.timeSensitivity.reminderText}`
    }
    
    return annotation
  }

  checkEmergencyKeywords(userInput: string): { isEmergency: boolean; warningText?: string } {
    const input = userInput.toLowerCase()
    const emergencyTriggers = systemPromptConfig.systemPrompt.coreRules.safety.emergencyTriggers
    
    for (const trigger of emergencyTriggers) {
      if (input.includes(trigger.toLowerCase())) {
        return {
          isEmergency: true,
          warningText: systemPromptConfig.emergencyProtocols.response.immediate + '\n' +
                       systemPromptConfig.emergencyProtocols.response.action
        }
      }
    }

    return { isEmergency: false }
  }

  getMedicalBoundaryWarning(): string {
    return systemPromptConfig.systemPrompt.responseStructure.medicalBoundaryWarning
  }

  getDisclaimer(): string {
    return systemPromptConfig.systemPrompt.responseStructure.disclaimer
  }

  getFollowUpOpening(): string {
    return systemPromptConfig.systemPrompt.responseStructure.followUpOpening
  }

  private getOrCreateSession(sessionId: string): SessionState {
    if (!this.sessionStates.has(sessionId)) {
      this.sessionStates.set(sessionId, {
        hasChronicDisease: false,
        hasAllergy: false,
        askedQuestions: new Set()
      })
    }
    return this.sessionStates.get(sessionId)!
  }

  updateSessionState(sessionId: string, updates: Partial<SessionState>): void {
    const state = this.getOrCreateSession(sessionId)
    Object.assign(state, updates)
  }

  clearSession(sessionId: string): void {
    this.sessionStates.delete(sessionId)
  }

  buildEnhancedPrompt(userInput: string, sessionId: string): {
    systemPrompt: string
    needsFollowUp: boolean
    followUpQuestions: string[]
    sources: SourceAnnotation[]
    isEmergency: boolean
    emergencyWarning?: string
  } {
    const systemPrompt = this.getSystemPrompt()
    const followUpResult = this.analyzeFollowUpNeed(userInput, sessionId)
    const sources = this.findRelevantSources(userInput)
    const emergencyCheck = this.checkEmergencyKeywords(userInput)

    return {
      systemPrompt,
      needsFollowUp: followUpResult.needsFollowUp,
      followUpQuestions: followUpResult.questions,
      sources,
      isEmergency: emergencyCheck.isEmergency,
      emergencyWarning: emergencyCheck.warningText
    }
  }

  formatResponseWithMetadata(response: string, sources: SourceAnnotation[], includeWarning: boolean = true): string {
    let formattedResponse = response

    if (sources.length > 0) {
      const sourceAnnotations = sources.map(s => this.formatSourceAnnotation(s)).join('\n')
      formattedResponse += '\n\n' + sourceAnnotations
    }

    if (includeWarning) {
      formattedResponse += '\n\n' + this.getMedicalBoundaryWarning()
    }

    formattedResponse += '\n\n' + this.getDisclaimer()

    return formattedResponse
  }
}

export const credibilityService = new CredibilityService()
export type { SourceAnnotation, FollowUpResult, SessionState }
