export type DialogState = 
  | 'INIT'
  | 'SYMPTOM_COLLECTION'
  | 'DIAGNOSIS'
  | 'TREATMENT_INQUIRY'
  | 'DRUG_INQUIRY'
  | 'EXAMINATION_INQUIRY'
  | 'CLARIFICATION'
  | 'CONFIRMATION'
  | 'COMPLETED'
  | 'ERROR'

export type Intent =
  | 'health_consultation'
  | 'symptom_report'
  | 'diagnosis_request'
  | 'treatment_inquiry'
  | 'drug_inquiry'
  | 'examination_inquiry'
  | 'general_question'
  | 'clarification'
  | 'confirmation'
  | 'denial'
  | 'greeting'
  | 'farewell'
  | 'thanks'
  | 'unknown'

export type SlotName =
  | 'symptoms'
  | 'duration'
  | 'severity'
  | 'body_part'
  | 'disease'
  | 'drug'
  | 'examination'
  | 'age'
  | 'gender'
  | 'medical_history'
  | 'current_medication'
  | 'allergies'

export interface Slot {
  name: SlotName
  value: string | string[] | number | null
  required: boolean
  confirmed: boolean
  prompted: boolean
}

export interface DialogContext {
  sessionId: string
  currentState: DialogState
  intent: Intent | null
  slots: Map<SlotName, Slot>
  history: DialogTurn[]
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface DialogTurn {
  role: 'user' | 'assistant'
  content: string
  intent?: Intent
  entities?: ExtractedEntity[]
  timestamp: Date
}

export interface ExtractedEntity {
  type: string
  value: string
  confidence: number
  start: number
  end: number
}

export interface DialogAction {
  type: 'respond' | 'request_slot' | 'confirm' | 'transition' | 'complete' | 'error'
  response?: string
  slotToRequest?: SlotName
  targetState?: DialogState
  data?: Record<string, unknown>
}

export interface StateTransition {
  from: DialogState
  to: DialogState
  trigger: Intent | 'slot_filled' | 'confirmed' | 'timeout'
  action?: DialogAction
}

export const STATE_DEFINITIONS: Record<DialogState, {
  description: string
  requiredSlots: SlotName[]
  optionalSlots: SlotName[]
  possibleTransitions: DialogState[]
}> = {
  INIT: {
    description: '初始状态，等待用户输入',
    requiredSlots: [],
    optionalSlots: [],
    possibleTransitions: ['SYMPTOM_COLLECTION', 'DIAGNOSIS', 'TREATMENT_INQUIRY', 'DRUG_INQUIRY', 'EXAMINATION_INQUIRY']
  },
  SYMPTOM_COLLECTION: {
    description: '收集用户症状信息',
    requiredSlots: ['symptoms'],
    optionalSlots: ['duration', 'severity', 'body_part'],
    possibleTransitions: ['DIAGNOSIS', 'CLARIFICATION', 'CONFIRMATION']
  },
  DIAGNOSIS: {
    description: '基于症状进行诊断分析',
    requiredSlots: ['symptoms'],
    optionalSlots: ['age', 'gender', 'medical_history'],
    possibleTransitions: ['TREATMENT_INQUIRY', 'EXAMINATION_INQUIRY', 'COMPLETED']
  },
  TREATMENT_INQUIRY: {
    description: '治疗建议咨询',
    requiredSlots: ['disease'],
    optionalSlots: ['current_medication', 'allergies'],
    possibleTransitions: ['DRUG_INQUIRY', 'EXAMINATION_INQUIRY', 'COMPLETED']
  },
  DRUG_INQUIRY: {
    description: '药品信息咨询',
    requiredSlots: ['drug'],
    optionalSlots: ['age', 'medical_history', 'allergies'],
    possibleTransitions: ['COMPLETED', 'CLARIFICATION']
  },
  EXAMINATION_INQUIRY: {
    description: '检查项目咨询',
    requiredSlots: ['examination'],
    optionalSlots: ['disease'],
    possibleTransitions: ['COMPLETED', 'CLARIFICATION']
  },
  CLARIFICATION: {
    description: '需要用户澄清信息',
    requiredSlots: [],
    optionalSlots: [],
    possibleTransitions: ['SYMPTOM_COLLECTION', 'DIAGNOSIS', 'TREATMENT_INQUIRY', 'DRUG_INQUIRY']
  },
  CONFIRMATION: {
    description: '确认用户信息',
    requiredSlots: [],
    optionalSlots: [],
    possibleTransitions: ['DIAGNOSIS', 'SYMPTOM_COLLECTION', 'COMPLETED']
  },
  COMPLETED: {
    description: '对话完成',
    requiredSlots: [],
    optionalSlots: [],
    possibleTransitions: ['INIT']
  },
  ERROR: {
    description: '错误状态',
    requiredSlots: [],
    optionalSlots: [],
    possibleTransitions: ['INIT']
  }
}

export const INTENT_PATTERNS: Record<Intent, string[]> = {
  health_consultation: ['我有点不舒服', '身体不舒服', '感觉不太对', '想问一下健康问题'],
  symptom_report: ['我有', '我感觉', '我最近', '症状是', '出现了', '不舒服'],
  diagnosis_request: ['是什么病', '得了什么病', '可能是什么', '诊断', '怎么回事'],
  treatment_inquiry: ['怎么治', '怎么治疗', '治疗方法', '怎么好', '怎么康复'],
  drug_inquiry: ['吃什么药', '用什么药', '药品', '药物', '这个药', '副作用'],
  examination_inquiry: ['做什么检查', '检查', '化验', '体检', '需要检查什么'],
  general_question: ['什么是', '为什么', '怎么', '如何', '能不能'],
  clarification: ['我是说', '我的意思是', '不是', '不对', '其实是'],
  confirmation: ['是的', '对', '没错', '确认', '正确'],
  denial: ['不是', '不对', '没有', '没', '不'],
  greeting: ['你好', '您好', 'hi', 'hello', '早上好', '晚上好'],
  farewell: ['再见', '拜拜', '下次见', 'bye'],
  thanks: ['谢谢', '感谢', '多谢', 'thanks'],
  unknown: []
}

export const SLOT_PROMPTS: Record<SlotName, string> = {
  symptoms: '请问您具体有哪些症状呢？例如头痛、发热、咳嗽等。',
  duration: '这些症状持续多长时间了？',
  severity: '症状的严重程度如何？是轻微、中等还是严重？',
  body_part: '请问是哪个部位不舒服？',
  disease: '请问您想了解哪种疾病？',
  drug: '请问您想了解哪种药品？',
  examination: '请问您想了解哪项检查？',
  age: '请问您的年龄是？',
  gender: '请问您的性别是？',
  medical_history: '请问您有过相关的病史吗？',
  current_medication: '请问您目前在使用什么药物吗？',
  allergies: '请问您有药物过敏史吗？'
}
