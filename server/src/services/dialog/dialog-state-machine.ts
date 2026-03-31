import type {
  DialogState,
  Intent,
  DialogContext,
  DialogTurn,
  DialogAction,
  ExtractedEntity,
  SlotName
} from './dialog.types.js'
import { STATE_DEFINITIONS } from './dialog.types.js'
import { IntentRecognizer } from './intent-recognizer.js'
import { SlotFiller } from './slot-filler.js'

export class DialogStateMachine {
  private intentRecognizer: IntentRecognizer
  private slotFiller: SlotFiller
  private sessions: Map<string, DialogContext> = new Map()

  constructor() {
    this.intentRecognizer = new IntentRecognizer()
    this.slotFiller = new SlotFiller()
  }

  createContext(sessionId: string): DialogContext {
    const context: DialogContext = {
      sessionId,
      currentState: 'INIT',
      intent: null,
      slots: new Map(),
      history: [],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.sessions.set(sessionId, context)
    return context
  }

  getContext(sessionId: string): DialogContext | undefined {
    return this.sessions.get(sessionId)
  }

  processInput(
    sessionId: string,
    userInput: string
  ): {
    context: DialogContext
    action: DialogAction
  } {
    let context = this.sessions.get(sessionId)
    if (!context) {
      context = this.createContext(sessionId)
    }

    const { intent, confidence, entities } = this.intentRecognizer.recognizeIntent(userInput)

    context = this.updateContext(context, userInput, intent, entities)

    const action = this.determineAction(context, intent, entities, confidence)

    context = this.applyAction(context, action)

    this.sessions.set(sessionId, context)

    return { context, action }
  }

  private updateContext(
    context: DialogContext,
    userInput: string,
    intent: Intent,
    entities: ExtractedEntity[]
  ): DialogContext {
    const updatedContext = { ...context }

    const turn: DialogTurn = {
      role: 'user',
      content: userInput,
      intent,
      entities,
      timestamp: new Date()
    }
    updatedContext.history.push(turn)

    updatedContext.intent = intent

    updatedContext.slots = new Map(context.slots)
    const filledContext = this.slotFiller.fillSlots(updatedContext, entities)

    filledContext.updatedAt = new Date()
    return filledContext
  }

  private determineAction(
    context: DialogContext,
    intent: Intent,
    entities: ExtractedEntity[],
    confidence: number
  ): DialogAction {
    const currentState = context.currentState

    if (intent === 'greeting') {
      return {
        type: 'respond',
        response: '您好！我是您的健康助手。请问有什么可以帮助您的？您可以描述您的症状，或者咨询药品、检查等相关问题。'
      }
    }

    if (intent === 'farewell') {
      return {
        type: 'complete',
        response: '感谢您的咨询！如果还有其他问题，随时可以问我。祝您身体健康！'
      }
    }

    if (intent === 'thanks') {
      return {
        type: 'respond',
        response: '不客气！很高兴能帮助到您。如果还有其他问题，请随时提问。'
      }
    }

    if (intent === 'confirmation') {
      return this.handleConfirmation(context)
    }

    if (intent === 'denial') {
      return this.handleDenial(context)
    }

    if (intent === 'clarification') {
      return {
        type: 'respond',
        response: '好的，请您详细描述一下，我会尽力理解您的意思。'
      }
    }

    if (confidence < 0.5) {
      return {
        type: 'respond',
        response: '抱歉，我不太理解您的意思。您能详细描述一下吗？例如您的症状、想了解的药品或检查项目？'
      }
    }

    switch (currentState) {
      case 'INIT':
        return this.handleInitState(context, intent, entities)

      case 'SYMPTOM_COLLECTION':
        return this.handleSymptomCollection(context, intent, entities)

      case 'DIAGNOSIS':
        return this.handleDiagnosis(context, intent, entities)

      case 'TREATMENT_INQUIRY':
        return this.handleTreatmentInquiry(context, intent, entities)

      case 'DRUG_INQUIRY':
        return this.handleDrugInquiry(context, intent, entities)

      case 'EXAMINATION_INQUIRY':
        return this.handleExaminationInquiry(context, intent, entities)

      case 'CLARIFICATION':
        return this.handleClarification(context, intent, entities)

      case 'CONFIRMATION':
        return this.handleConfirmation(context)

      case 'COMPLETED':
        return this.handleCompleted(intent, entities)

      default:
        return {
          type: 'error',
          response: '抱歉，系统出现了问题。请重新开始对话。'
        }
    }
  }

  private handleInitState(
    context: DialogContext,
    intent: Intent,
    entities: ExtractedEntity[]
  ): DialogAction {
    const hasSymptoms = entities.some(e => e.type === 'symptom')
    const hasDrug = entities.some(e => e.type === 'drug')
    const hasExamination = entities.some(e => e.type === 'examination')
    const hasDisease = entities.some(e => e.type === 'disease')

    if (hasSymptoms || intent === 'symptom_report') {
      return {
        type: 'transition',
        targetState: 'SYMPTOM_COLLECTION',
        response: '我了解您有一些症状。' + this.slotFiller.getSlotSummary(context)
      }
    }

    if (hasDrug || intent === 'drug_inquiry') {
      return {
        type: 'transition',
        targetState: 'DRUG_INQUIRY',
        response: '您想了解药品信息。请问具体是哪种药品？'
      }
    }

    if (hasExamination || intent === 'examination_inquiry') {
      return {
        type: 'transition',
        targetState: 'EXAMINATION_INQUIRY',
        response: '您想了解检查项目。请问具体是哪项检查？'
      }
    }

    if (hasDisease || intent === 'treatment_inquiry') {
      return {
        type: 'transition',
        targetState: 'TREATMENT_INQUIRY',
        response: '您想了解治疗相关信息。请问您想了解哪种疾病的治疗？'
      }
    }

    if (intent === 'diagnosis_request') {
      return {
        type: 'transition',
        targetState: 'SYMPTOM_COLLECTION',
        response: '好的，我来帮您分析症状。请问您目前有哪些不舒服的地方？'
      }
    }

    return {
      type: 'respond',
      response: '请问您想咨询什么问题？您可以描述您的症状，或者询问药品、检查等相关信息。'
    }
  }

  private handleSymptomCollection(
    context: DialogContext,
    intent: Intent,
    entities: ExtractedEntity[]
  ): DialogAction {
    const missingSlots = this.slotFiller.getMissingRequiredSlots(context)

    if (missingSlots.length > 0) {
      const nextSlot = this.slotFiller.getNextSlotToRequest(context)
      if (nextSlot) {
        return this.slotFiller.createSlotRequestAction(nextSlot)
      }
    }

    const symptoms = context.slots.get('symptoms')?.value
    if (symptoms && Array.isArray(symptoms) && symptoms.length > 0) {
      return {
        type: 'transition',
        targetState: 'DIAGNOSIS',
        response: `好的，根据您描述的症状：${symptoms.join('、')}，我来为您分析可能的原因。`,
        data: { symptoms }
      }
    }

    return {
      type: 'respond',
      response: '请问您具体有哪些症状呢？例如头痛、发热、咳嗽等。'
    }
  }

  private handleDiagnosis(
    context: DialogContext,
    intent: Intent,
    entities: ExtractedEntity[]
  ): DialogAction {
    return {
      type: 'complete',
      response: '根据您的症状，我已为您生成分析报告。您还想了解其他信息吗？例如治疗建议、用药指导或检查项目？',
      data: { diagnosisComplete: true }
    }
  }

  private handleTreatmentInquiry(
    context: DialogContext,
    intent: Intent,
    entities: ExtractedEntity[]
  ): DialogAction {
    const disease = context.slots.get('disease')?.value

    if (!disease) {
      return {
        type: 'request_slot',
        slotToRequest: 'disease',
        response: '请问您想了解哪种疾病的治疗方法？'
      }
    }

    return {
      type: 'complete',
      response: `关于${disease}的治疗，我已为您整理了相关信息。还有其他问题吗？`,
      data: { disease }
    }
  }

  private handleDrugInquiry(
    context: DialogContext,
    intent: Intent,
    entities: ExtractedEntity[]
  ): DialogAction {
    const drug = context.slots.get('drug')?.value

    if (!drug) {
      return {
        type: 'request_slot',
        slotToRequest: 'drug',
        response: '请问您想了解哪种药品？'
      }
    }

    return {
      type: 'complete',
      response: `关于${drug}，我已为您查询了相关信息。还有其他问题吗？`,
      data: { drug }
    }
  }

  private handleExaminationInquiry(
    context: DialogContext,
    intent: Intent,
    entities: ExtractedEntity[]
  ): DialogAction {
    const examination = context.slots.get('examination')?.value

    if (!examination) {
      return {
        type: 'request_slot',
        slotToRequest: 'examination',
        response: '请问您想了解哪项检查？'
      }
    }

    return {
      type: 'complete',
      response: `关于${examination}，我已为您查询了相关信息。还有其他问题吗？`,
      data: { examination }
    }
  }

  private handleClarification(
    context: DialogContext,
    intent: Intent,
    entities: ExtractedEntity[]
  ): DialogAction {
    return {
      type: 'respond',
      response: '感谢您的澄清。' + this.slotFiller.getSlotSummary(context)
    }
  }

  private handleConfirmation(context: DialogContext): DialogAction {
    const currentState = context.currentState

    if (currentState === 'CONFIRMATION') {
      return {
        type: 'transition',
        targetState: 'DIAGNOSIS',
        response: '好的，信息已确认。我现在为您进行分析。'
      }
    }

    return {
      type: 'respond',
      response: '好的，已记录。请问还有其他需要补充的吗？'
    }
  }

  private handleDenial(context: DialogContext): DialogAction {
    const lastSlot = this.getLastFilledSlot(context)

    if (lastSlot) {
      const clearedContext = this.slotFiller.clearSlot(context, lastSlot)
      this.sessions.set(context.sessionId, clearedContext)

      return {
        type: 'request_slot',
        slotToRequest: lastSlot,
        response: `好的，那请问正确的${this.getSlotDisplayName(lastSlot)}是什么？`
      }
    }

    return {
      type: 'respond',
      response: '好的，请您重新描述一下您的问题。'
    }
  }

  private handleCompleted(intent: Intent, entities: ExtractedEntity[]): DialogAction {
    if (intent === 'health_consultation' || intent === 'symptom_report') {
      return {
        type: 'transition',
        targetState: 'INIT',
        response: '好的，请问还有什么可以帮助您的？'
      }
    }

    return {
      type: 'complete',
      response: '感谢您的咨询！如果还有其他问题，随时可以问我。'
    }
  }

  private applyAction(context: DialogContext, action: DialogAction): DialogContext {
    const updatedContext = { ...context }

    if (action.type === 'transition' && action.targetState) {
      updatedContext.currentState = action.targetState
    }

    if (action.type === 'request_slot' && action.slotToRequest) {
      const slot = updatedContext.slots.get(action.slotToRequest)
      if (slot) {
        slot.prompted = true
        updatedContext.slots.set(action.slotToRequest, { ...slot })
      }
    }

    if (action.type === 'complete') {
      updatedContext.currentState = 'COMPLETED'
    }

    if (action.response) {
      const turn: DialogTurn = {
        role: 'assistant',
        content: action.response,
        timestamp: new Date()
      }
      updatedContext.history.push(turn)
    }

    updatedContext.updatedAt = new Date()
    return updatedContext
  }

  private getLastFilledSlot(context: DialogContext): SlotName | null {
    const slots = Array.from(context.slots.entries())
    for (let i = slots.length - 1; i >= 0; i--) {
      const [name, slot] = slots[i]
      if (slot.value !== null && !slot.confirmed) {
        return name
      }
    }
    return null
  }

  private getSlotDisplayName(slotName: string): string {
    const displayNames: Record<string, string> = {
      symptoms: '症状',
      duration: '持续时间',
      severity: '严重程度',
      body_part: '部位',
      disease: '疾病',
      drug: '药品',
      examination: '检查项目',
      age: '年龄'
    }
    return displayNames[slotName] || slotName
  }

  resetSession(sessionId: string): void {
    this.sessions.delete(sessionId)
  }

  getSessionStats(): {
    totalSessions: number
    activeSessions: number
  } {
    const now = Date.now()
    const fiveMinutesAgo = now - 5 * 60 * 1000

    let activeCount = 0
    this.sessions.forEach(context => {
      if (context.updatedAt.getTime() > fiveMinutesAgo) {
        activeCount++
      }
    })

    return {
      totalSessions: this.sessions.size,
      activeSessions: activeCount
    }
  }
}
