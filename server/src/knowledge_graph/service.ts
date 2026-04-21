/**
 * 知识图谱服务模块
 * 
 * 该模块实现了医学知识图谱的核心功能，包括：
 * - 疾病、症状、药物、检查的检索
 * - 症状分析与疾病推理
 * - 知识图谱关系查询
 * 
 * @module KnowledgeGraphService
 * @author 智疗助手团队
 * @version 1.0.0
 */

import { DISEASES, SYMPTOMS, DRUGS, EXAMINATIONS, BODY_PARTS, DEPARTMENTS, RELATIONS } from './seed_data.js'
import type { Disease, Symptom, Drug, Examination, Relation } from './schema.js'

/**
 * 知识查询结果接口
 * @interface KnowledgeQueryResult
 */
export interface KnowledgeQueryResult {
  /** 匹配的疾病列表 */
  diseases: Disease[]
  /** 匹配的症状列表 */
  symptoms: Symptom[]
  /** 匹配的药物列表 */
  drugs: Drug[]
  /** 匹配的检查列表 */
  examinations: Examination[]
  /** 相关关系列表 */
  relatedRelations: Relation[]
}

/**
 * 症状分析结果接口
 * @interface SymptomAnalysisResult
 */
export interface SymptomAnalysisResult {
  /** 可能的疾病列表，包含概率和匹配的症状 */
  possibleDiseases: Array<{
    /** 疾病实体 */
    disease: Disease
    /** 匹配概率（0-1） */
    probability: number
    /** 匹配的症状名称列表 */
    matchedSymptoms: string[]
  }>
  /** 推荐的检查项目 */
  recommendedExaminations: Examination[]
  /** 推荐的就诊科室 */
  recommendedDepartments: string[]
}

/**
 * 医学知识图谱服务类
 * 
 * 提供医学知识图谱的各种查询和分析功能。
 * 支持肺部专科疾病的智能诊断推理。
 * 
 * @class KnowledgeGraphService
 * @example
 * ```typescript
 * const service = new KnowledgeGraphService()
 * const diseases = service.searchDiseases('肺癌')
 * const analysis = service.analyzeSymptoms(['咳嗽', '咯血'])
 * ```
 */
class KnowledgeGraphService {
  /** 疾病实体映射表（ID -> Disease） */
  private diseaseMap: Map<string, Disease>
  /** 症状实体映射表（ID -> Symptom） */
  private symptomMap: Map<string, Symptom>
  /** 药物实体映射表（ID -> Drug） */
  private drugMap: Map<string, Drug>
  /** 检查实体映射表（ID -> Examination） */
  private examinationMap: Map<string, Examination>
  /** 关系列表 */
  private relations: Relation[]

  /**
   * 构造函数
   * 初始化所有实体映射表
   */
  constructor() {
    this.diseaseMap = new Map(DISEASES.map(d => [d.id, d]))
    this.symptomMap = new Map(SYMPTOMS.map(s => [s.id, s]))
    this.drugMap = new Map(DRUGS.map(d => [d.id, d]))
    this.examinationMap = new Map(EXAMINATIONS.map(e => [e.id, e]))
    this.relations = RELATIONS
  }

  /**
   * 搜索疾病
   * 
   * 支持按名称、别名、症状、描述进行模糊搜索
   * 
   * @param {string} query - 搜索关键词
   * @returns {Disease[]} 匹配的疾病列表
   * @example
   * ```typescript
   * // 按名称搜索
   * const results = service.searchDiseases('肺癌')
   * 
   * // 按别名搜索
   * const copd = service.searchDiseases('COPD')
   * ```
   */
  searchDiseases(query: string): Disease[] {
    const lowerQuery = query.toLowerCase()
    return DISEASES.filter(d => 
      d.name.includes(query) ||
      d.aliases.some(a => a.toLowerCase().includes(lowerQuery)) ||
      d.symptoms.some(s => s.includes(query)) ||
      d.description.includes(query)
    )
  }

  /**
   * 搜索症状
   * 
   * 支持按名称、别名、描述进行模糊搜索
   * 
   * @param {string} query - 搜索关键词
   * @returns {Symptom[]} 匹配的症状列表
   */
  searchSymptoms(query: string): Symptom[] {
    const lowerQuery = query.toLowerCase()
    return SYMPTOMS.filter(s =>
      s.name.includes(query) ||
      s.aliases.some(a => a.toLowerCase().includes(lowerQuery)) ||
      s.description.includes(query)
    )
  }

  /**
   * 搜索药物
   * 
   * 支持按名称、通用名、别名、适应症进行模糊搜索
   * 
   * @param {string} query - 搜索关键词
   * @returns {Drug[]} 匹配的药物列表
   */
  searchDrugs(query: string): Drug[] {
    const lowerQuery = query.toLowerCase()
    return DRUGS.filter(d =>
      d.name.includes(query) ||
      d.genericName.toLowerCase().includes(lowerQuery) ||
      d.aliases.some(a => a.toLowerCase().includes(lowerQuery)) ||
      d.indications.some(i => i.includes(query))
    )
  }

  /**
   * 根据ID获取疾病实体
   * @param {string} id - 疾病ID
   * @returns {Disease | undefined} 疾病实体，不存在则返回undefined
   */
  getDiseaseById(id: string): Disease | undefined {
    return this.diseaseMap.get(id)
  }

  /**
   * 根据ID获取症状实体
   * @param {string} id - 症状ID
   * @returns {Symptom | undefined} 症状实体，不存在则返回undefined
   */
  getSymptomById(id: string): Symptom | undefined {
    return this.symptomMap.get(id)
  }

  /**
   * 根据ID获取药物实体
   * @param {string} id - 药物ID
   * @returns {Drug | undefined} 药物实体，不存在则返回undefined
   */
  getDrugById(id: string): Drug | undefined {
    return this.drugMap.get(id)
  }

  /**
   * 获取疾病的关联症状
   * 
   * 返回与指定疾病关联的所有症状，按关系权重排序
   * 
   * @param {string} diseaseId - 疾病ID
   * @returns {Symptom[]} 关联的症状列表，按权重降序排列
   */
  getDiseaseSymptoms(diseaseId: string): Symptom[] {
    const relations = this.relations.filter(
      r => r.sourceId === diseaseId && r.type === 'HAS_SYMPTOM'
    )
    return relations
      .map(r => this.symptomMap.get(r.targetId))
      .filter((s): s is Symptom => s !== undefined)
      .sort((a, b) => {
        const relA = relations.find(r => r.targetId === a.id)
        const relB = relations.find(r => r.targetId === b.id)
        return (relB?.weight || 0) - (relA?.weight || 0)
      })
  }

  /**
   * 获取疾病的治疗药物
   * 
   * 返回可用于治疗指定疾病的药物，按关系权重排序
   * 
   * @param {string} diseaseId - 疾病ID
   * @returns {Drug[]} 治疗药物列表，按权重降序排列
   */
  getDiseaseDrugs(diseaseId: string): Drug[] {
    const relations = this.relations.filter(
      r => r.sourceId === diseaseId && r.type === 'TREATED_BY'
    )
    return relations
      .map(r => this.drugMap.get(r.targetId))
      .filter((d): d is Drug => d !== undefined)
      .sort((a, b) => {
        const relA = relations.find(r => r.targetId === a.id)
        const relB = relations.find(r => r.targetId === b.id)
        return (relB?.weight || 0) - (relA?.weight || 0)
      })
  }

  /**
   * 获取疾病的推荐检查
   * 
   * 返回诊断指定疾病所需的检查项目，按关系权重排序
   * 
   * @param {string} diseaseId - 疾病ID
   * @returns {Examination[]} 推荐检查列表，按权重降序排列
   */
  getDiseaseExaminations(diseaseId: string): Examination[] {
    const relations = this.relations.filter(
      r => r.sourceId === diseaseId && r.type === 'NEEDS_EXAMINATION'
    )
    return relations
      .map(r => this.examinationMap.get(r.targetId))
      .filter((e): e is Examination => e !== undefined)
      .sort((a, b) => {
        const relA = relations.find(r => r.targetId === a.id)
        const relB = relations.find(r => r.targetId === b.id)
        return (relB?.weight || 0) - (relA?.weight || 0)
      })
  }

  /**
   * 分析症状并推理可能的疾病
   * 
   * 基于知识图谱的症状-疾病关系，计算可能的疾病及其概率，
   * 并推荐相应的检查项目和就诊科室。
   * 
   * @param {string[]} symptomNames - 症状名称列表
   * @returns {SymptomAnalysisResult} 分析结果，包含可能的疾病、推荐检查和科室
   * @example
   * ```typescript
   * const result = service.analyzeSymptoms(['咳嗽', '咯血', '胸痛'])
   * console.log(result.possibleDiseases[0].disease.name) // 可能是"肺癌"
   * console.log(result.recommendedDepartments) // ["胸外科", "肿瘤科"]
   * ```
   */
  analyzeSymptoms(symptomNames: string[]): SymptomAnalysisResult {
    const matchedSymptoms: Symptom[] = []
    
    for (const name of symptomNames) {
      const symptom = SYMPTOMS.find(s =>
        s.name === name ||
        s.aliases.some(a => a === name)
      )
      if (symptom) {
        matchedSymptoms.push(symptom)
      }
    }

    const diseaseScores = new Map<string, { disease: Disease; score: number; matchedSymptoms: string[] }>()

    for (const symptom of matchedSymptoms) {
      const relations = this.relations.filter(
        r => r.targetId === symptom.id && r.type === 'HAS_SYMPTOM'
      )

      for (const rel of relations) {
        const disease = this.diseaseMap.get(rel.sourceId)
        if (disease) {
          const existing = diseaseScores.get(disease.id)
          if (existing) {
            existing.score += rel.weight
            existing.matchedSymptoms.push(symptom.name)
          } else {
            diseaseScores.set(disease.id, {
              disease,
              score: rel.weight,
              matchedSymptoms: [symptom.name]
            })
          }
        }
      }
    }

    const possibleDiseases = Array.from(diseaseScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => ({
        disease: item.disease,
        probability: Math.min(item.score / matchedSymptoms.length, 1),
        matchedSymptoms: [...new Set(item.matchedSymptoms)]
      }))

    const examinationSet = new Set<string>()
    const departmentSet = new Set<string>()

    for (const { disease } of possibleDiseases) {
      const examinations = this.getDiseaseExaminations(disease.id)
      examinations.forEach(e => examinationSet.add(e.id))
      
      const deptRelations = this.relations.filter(
        r => r.sourceId === disease.id && r.type === 'BELONGS_TO_DEPARTMENT'
      )
      deptRelations.forEach(r => {
        const dept = DEPARTMENTS.find(d => d.id === r.targetId)
        if (dept) departmentSet.add(dept.name)
      })
    }

    const recommendedExaminations = Array.from(examinationSet)
      .map(id => this.examinationMap.get(id))
      .filter((e): e is Examination => e !== undefined)

    return {
      possibleDiseases,
      recommendedExaminations,
      recommendedDepartments: Array.from(departmentSet)
    }
  }

  /**
   * 获取药物的相互作用
   * @param {string} drugId - 药物ID
   * @returns {string[]} 相互作用药物列表
   */
  getDrugInteractions(drugId: string): string[] {
    const drug = this.drugMap.get(drugId)
    return drug?.interactions || []
  }

  /**
   * 获取药物的不良反应
   * @param {string} drugId - 药物ID
   * @returns {string[]} 不良反应列表
   */
  getDrugSideEffects(drugId: string): string[] {
    const drug = this.drugMap.get(drugId)
    return drug?.sideEffects || []
  }

  /**
   * 获取知识图谱统计信息
   * @returns {Object} 统计信息对象
   */
  getStatistics() {
    return {
      totalDiseases: DISEASES.length,
      totalSymptoms: SYMPTOMS.length,
      totalDrugs: DRUGS.length,
      totalExaminations: EXAMINATIONS.length,
      totalRelations: RELATIONS.length,
      lungRelatedDiseases: DISEASES.filter(d => 
        d.name.includes('肺') || 
        d.aliases.some(a => a.includes('肺') || a.toLowerCase().includes('lung'))
      ).length
    }
  }

  /**
   * 获取所有疾病实体
   * @returns {Disease[]} 所有疾病列表
   */
  getAllDiseases(): Disease[] {
    return DISEASES
  }

  /**
   * 获取所有症状实体
   * @returns {Symptom[]} 所有症状列表
   */
  getAllSymptoms(): Symptom[] {
    return SYMPTOMS
  }

  /**
   * 获取所有药物实体
   * @returns {Drug[]} 所有药物列表
   */
  getAllDrugs(): Drug[] {
    return DRUGS
  }

  /**
   * 获取所有检查实体
   * @returns {Examination[]} 所有检查列表
   */
  getAllExaminations(): Examination[] {
    return EXAMINATIONS
  }

  /**
   * 获取所有科室
   * @returns {Department[]} 所有科室列表
   */
  getAllDepartments() {
    return DEPARTMENTS
  }
}

/** 知识图谱服务单例实例 */
export const knowledgeGraphService = new KnowledgeGraphService()
export default knowledgeGraphService
