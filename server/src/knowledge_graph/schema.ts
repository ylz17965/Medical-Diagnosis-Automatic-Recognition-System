export interface Disease {
  id: string
  name: string
  aliases: string[]
  symptoms: string[]
  departments: string[]
  description: string
  causes: string[]
  prevention: string[]
  complications: string[]
  icdCode?: string
}

export interface Symptom {
  id: string
  name: string
  aliases: string[]
  relatedBodyParts: string[]
  severityLevel: 'mild' | 'moderate' | 'severe'
  description: string
  possibleDiseases: string[]
}

export interface Drug {
  id: string
  name: string
  genericName: string
  aliases: string[]
  category: DrugCategory
  indications: string[]
  contraindications: string[]
  dosage: {
    adult: string
    children?: string
    frequency: string
    maxDose?: string
  }
  sideEffects: string[]
  interactions: string[]
  storage: string
  otc: boolean
  approvalNumber?: string
}

export type DrugCategory = 
  | 'antipyretic_analgesic'
  | 'antibiotic'
  | 'antiviral'
  | 'cardiovascular'
  | 'respiratory'
  | 'digestive'
  | 'dermatological'
  | 'vitamin'
  | 'chinese_medicine'
  | 'other'

export interface Examination {
  id: string
  name: string
  aliases: string[]
  category: ExamCategory
  normalRange: {
    min?: number
    max?: number
    unit: string
    description?: string
  }[]
  clinicalSignificance: string
  preparationRequired: string[]
  relatedDiseases: string[]
}

export type ExamCategory = 
  | 'blood'
  | 'urine'
  | 'stool'
  | 'imaging'
  | 'cardiac'
  | 'liver'
  | 'kidney'
  | 'thyroid'
  | 'tumor_marker'
  | 'other'

export interface BodyPart {
  id: string
  name: string
  system: BodySystem
  relatedSymptoms: string[]
}

export type BodySystem = 
  | 'respiratory'
  | 'digestive'
  | 'cardiovascular'
  | 'nervous'
  | 'musculoskeletal'
  | 'endocrine'
  | 'urinary'
  | 'reproductive'
  | 'integumentary'
  | 'immune'

export interface Department {
  id: string
  name: string
  aliases: string[]
  commonDiseases: string[]
  description: string
}

export interface Relation {
  id: string
  type: RelationType
  sourceId: string
  sourceType: EntityType
  targetId: string
  targetType: EntityType
  weight: number
  metadata?: Record<string, unknown>
}

export type RelationType =
  | 'HAS_SYMPTOM'
  | 'TREATED_BY'
  | 'NEEDS_EXAMINATION'
  | 'LOCATED_AT'
  | 'HAS_SIDE_EFFECT'
  | 'BELONGS_TO_DEPARTMENT'
  | 'CAUSED_BY'
  | 'PREVENTED_BY'
  | 'COMPLICATED_BY'
  | 'RELATED_TO'
  | 'CONTRAINDICATED_FOR'
  | 'INDICATED_FOR'

export type EntityType = 'Disease' | 'Symptom' | 'Drug' | 'Examination' | 'BodyPart' | 'Department'

export interface KnowledgeGraphSchema {
  nodeTypes: {
    Disease: {
      properties: (keyof Disease)[]
      required: ('id' | 'name')[]
    }
    Symptom: {
      properties: (keyof Symptom)[]
      required: ('id' | 'name')[]
    }
    Drug: {
      properties: (keyof Drug)[]
      required: ('id' | 'name' | 'category')[]
    }
    Examination: {
      properties: (keyof Examination)[]
      required: ('id' | 'name' | 'category')[]
    }
    BodyPart: {
      properties: (keyof BodyPart)[]
      required: ('id' | 'name' | 'system')[]
    }
    Department: {
      properties: (keyof Department)[]
      required: ('id' | 'name')[]
    }
  }
  relationTypes: {
    type: RelationType
    description: string
    sourceTypes: EntityType[]
    targetTypes: EntityType[]
  }[]
}

export const SCHEMA: KnowledgeGraphSchema = {
  nodeTypes: {
    Disease: {
      properties: ['id', 'name', 'aliases', 'symptoms', 'departments', 'description', 'causes', 'prevention', 'complications', 'icdCode'],
      required: ['id', 'name']
    },
    Symptom: {
      properties: ['id', 'name', 'aliases', 'relatedBodyParts', 'severityLevel', 'description', 'possibleDiseases'],
      required: ['id', 'name']
    },
    Drug: {
      properties: ['id', 'name', 'genericName', 'aliases', 'category', 'indications', 'contraindications', 'dosage', 'sideEffects', 'interactions', 'storage', 'otc', 'approvalNumber'],
      required: ['id', 'name', 'category']
    },
    Examination: {
      properties: ['id', 'name', 'aliases', 'category', 'normalRange', 'clinicalSignificance', 'preparationRequired', 'relatedDiseases'],
      required: ['id', 'name', 'category']
    },
    BodyPart: {
      properties: ['id', 'name', 'system', 'relatedSymptoms'],
      required: ['id', 'name', 'system']
    },
    Department: {
      properties: ['id', 'name', 'aliases', 'commonDiseases', 'description'],
      required: ['id', 'name']
    }
  },
  relationTypes: [
    {
      type: 'HAS_SYMPTOM',
      description: '疾病具有的症状',
      sourceTypes: ['Disease'],
      targetTypes: ['Symptom']
    },
    {
      type: 'TREATED_BY',
      description: '疾病可使用的药物',
      sourceTypes: ['Disease'],
      targetTypes: ['Drug']
    },
    {
      type: 'NEEDS_EXAMINATION',
      description: '疾病需要做的检查',
      sourceTypes: ['Disease'],
      targetTypes: ['Examination']
    },
    {
      type: 'LOCATED_AT',
      description: '症状所在的身体部位',
      sourceTypes: ['Symptom'],
      targetTypes: ['BodyPart']
    },
    {
      type: 'HAS_SIDE_EFFECT',
      description: '药物可能产生的副作用',
      sourceTypes: ['Drug'],
      targetTypes: ['Symptom']
    },
    {
      type: 'BELONGS_TO_DEPARTMENT',
      description: '疾病所属科室',
      sourceTypes: ['Disease'],
      targetTypes: ['Department']
    },
    {
      type: 'CAUSED_BY',
      description: '疾病的可能病因',
      sourceTypes: ['Disease'],
      targetTypes: ['Disease', 'Symptom']
    },
    {
      type: 'PREVENTED_BY',
      description: '疾病的预防措施',
      sourceTypes: ['Disease'],
      targetTypes: ['Drug', 'Examination']
    },
    {
      type: 'COMPLICATED_BY',
      description: '疾病的并发症',
      sourceTypes: ['Disease'],
      targetTypes: ['Disease']
    },
    {
      type: 'RELATED_TO',
      description: '症状相关的其他症状',
      sourceTypes: ['Symptom'],
      targetTypes: ['Symptom']
    },
    {
      type: 'CONTRAINDICATED_FOR',
      description: '药物禁忌症',
      sourceTypes: ['Drug'],
      targetTypes: ['Disease', 'Symptom']
    },
    {
      type: 'INDICATED_FOR',
      description: '药物适应症',
      sourceTypes: ['Drug'],
      targetTypes: ['Disease', 'Symptom']
    }
  ]
}
