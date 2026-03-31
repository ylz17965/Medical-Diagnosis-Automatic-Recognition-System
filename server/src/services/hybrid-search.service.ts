import { PrismaClient } from '@prisma/client'
import { RAGService, type RAGContext } from './rag.service.js'
import { knowledgeGraph } from '../knowledge_graph/index.js'
import type { Disease, Drug, Symptom, Examination } from '../knowledge_graph/schema.js'

export interface HybridSearchResult {
  type: 'vector' | 'knowledge_graph'
  content: string
  source: string
  score: number
  metadata?: Record<string, unknown>
  graphContext?: GraphContext
}

export interface GraphContext {
  entityType: string
  entityId: string
  entityName: string
  relations: {
    type: string
    targetName: string
    targetType: string
  }[]
}

export interface DiagnosisResult {
  disease: Disease
  score: number
  matchedSymptoms: string[]
  relatedDrugs: { drug: Drug; weight: number }[]
  relatedExaminations: { examination: Examination; weight: number }[]
}

export class HybridSearchService {
  private ragService: RAGService
  private prisma: PrismaClient
  private kgWeight: number
  private vectorWeight: number

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.ragService = new RAGService(prisma)
    this.kgWeight = 0.4
    this.vectorWeight = 0.6
  }

  async initialize(): Promise<void> {
    await knowledgeGraph.load()
  }

  async search(params: {
    query: string
    category?: string
    topK?: number
    includeGraph?: boolean
  }): Promise<HybridSearchResult[]> {
    const { query, category, topK = 10, includeGraph = true } = params

    const [vectorResults, graphResults] = await Promise.all([
      this.ragService.searchWithRerank({ query, category, topK }),
      includeGraph ? this.searchKnowledgeGraph(query, topK) : Promise.resolve([])
    ])

    const combinedResults: HybridSearchResult[] = [
      ...vectorResults.map(r => ({
        type: 'vector' as const,
        content: r.content,
        source: r.source,
        score: r.score * this.vectorWeight,
        metadata: r.metadata
      })),
      ...graphResults.map(r => ({
        type: 'knowledge_graph' as const,
        content: r.content,
        source: r.source,
        score: r.score * this.kgWeight,
        graphContext: r.graphContext
      }))
    ]

    combinedResults.sort((a, b) => b.score - a.score)

    return combinedResults.slice(0, topK)
  }

  private async searchKnowledgeGraph(
    query: string,
    topK: number
  ): Promise<HybridSearchResult[]> {
    const results: HybridSearchResult[] = []

    const nodes = knowledgeGraph.search(query, topK)

    for (const node of nodes) {
      const relations = knowledgeGraph.getRelations(node.id)
      const relatedNodes = knowledgeGraph.getRelatedNodes(node.id)

      const graphContext: GraphContext = {
        entityType: node.type,
        entityId: node.id,
        entityName: (node.data as { name: string }).name,
        relations: relations.slice(0, 5).map(r => {
          const targetNode = knowledgeGraph.getNode(r.targetId)
          return {
            type: r.type,
            targetName: targetNode ? (targetNode.data as { name: string }).name : '',
            targetType: r.targetType
          }
        })
      }

      const content = this.buildGraphContent(node, relatedNodes)

      results.push({
        type: 'knowledge_graph',
        content,
        source: `知识图谱: ${node.type}`,
        score: 0.8,
        graphContext
      })
    }

    return results
  }

  private buildGraphContent(
    node: { id: string; type: string; data: unknown },
    relatedNodes: { id: string; type: string; data: unknown }[]
  ): string {
    const data = node.data as Record<string, unknown>
    let content = `【${node.type === 'Disease' ? '疾病' : node.type === 'Symptom' ? '症状' : node.type === 'Drug' ? '药品' : node.type === 'Examination' ? '检查' : node.type}】${data.name as string}\n`

    if (data.description) {
      content += `描述: ${data.description as string}\n`
    }

    if (node.type === 'Disease') {
      const disease = data as unknown as Disease
      if (disease.symptoms?.length) {
        content += `症状: ${disease.symptoms.join('、')}\n`
      }
      if (disease.departments?.length) {
        content += `科室: ${disease.departments.join('、')}\n`
      }
      if (disease.causes?.length) {
        content += `病因: ${disease.causes.join('、')}\n`
      }
      if (disease.prevention?.length) {
        content += `预防: ${disease.prevention.join('、')}\n`
      }
    }

    if (node.type === 'Drug') {
      const drug = data as unknown as Drug
      if (drug.indications?.length) {
        content += `适应症: ${drug.indications.join('、')}\n`
      }
      if (drug.contraindications?.length) {
        content += `禁忌症: ${drug.contraindications.join('、')}\n`
      }
      if (drug.dosage) {
        content += `用法用量: ${drug.dosage.adult}，${drug.dosage.frequency}\n`
      }
      if (drug.sideEffects?.length) {
        content += `副作用: ${drug.sideEffects.join('、')}\n`
      }
    }

    if (node.type === 'Examination') {
      const exam = data as unknown as Examination
      if (exam.normalRange?.length) {
        const ranges = exam.normalRange.map(r => {
          if (r.min !== undefined && r.max !== undefined) {
            return `${r.description}: ${r.min}-${r.max} ${r.unit}`
          }
          return `${r.description}: ${r.description || '正常'}`
        })
        content += `正常范围: ${ranges.join('；')}\n`
      }
      if (exam.clinicalSignificance) {
        content += `临床意义: ${exam.clinicalSignificance}\n`
      }
    }

    return content.trim()
  }

  async diagnoseBySymptoms(symptoms: string[]): Promise<DiagnosisResult[]> {
    await knowledgeGraph.load()

    const symptomIds: string[] = []
    const matchedSymptomNames: string[] = []

    for (const symptom of symptoms) {
      const nodes = knowledgeGraph.getNodeByName(symptom)
      for (const node of nodes) {
        if (node.type === 'Symptom' && !symptomIds.includes(node.id)) {
          symptomIds.push(node.id)
          matchedSymptomNames.push((node.data as Symptom).name)
        }
      }
    }

    if (symptomIds.length === 0) {
      return []
    }

    const diseaseScores = knowledgeGraph.diagnoseBySymptoms(symptomIds)

    const results: DiagnosisResult[] = []
    for (const { disease, score } of diseaseScores.slice(0, 5)) {
      const relatedDrugs = knowledgeGraph.getDiseaseDrugs(disease.id)
      const relatedExaminations = knowledgeGraph.getDiseaseExaminations(disease.id)

      results.push({
        disease,
        score,
        matchedSymptoms: matchedSymptomNames,
        relatedDrugs,
        relatedExaminations
      })
    }

    return results
  }

  async getDrugInfo(drugName: string): Promise<{
    drug: Drug | null
    sideEffects: { symptom: Symptom; weight: number }[]
    relatedDiseases: Disease[]
  }> {
    await knowledgeGraph.load()

    const nodes = knowledgeGraph.getNodeByName(drugName)
    const drugNode = nodes.find(n => n.type === 'Drug')

    if (!drugNode) {
      return { drug: null, sideEffects: [], relatedDiseases: [] }
    }

    const drug = drugNode.data as Drug
    const sideEffects = knowledgeGraph.getDrugSideEffects(drugNode.id)

    const relations = knowledgeGraph.getRelations(drugNode.id, 'incoming')
      .filter(r => r.type === 'TREATED_BY')

    const relatedDiseases: Disease[] = []
    for (const r of relations) {
      const node = knowledgeGraph.getNode(r.sourceId)
      if (node?.type === 'Disease') {
        relatedDiseases.push(node.data as Disease)
      }
    }

    return { drug, sideEffects, relatedDiseases }
  }

  async getDiseaseInfo(diseaseName: string): Promise<{
    disease: Disease | null
    symptoms: { symptom: Symptom; weight: number }[]
    drugs: { drug: Drug; weight: number }[]
    examinations: { examination: Examination; weight: number }[]
  }> {
    await knowledgeGraph.load()

    const nodes = knowledgeGraph.getNodeByName(diseaseName)
    const diseaseNode = nodes.find(n => n.type === 'Disease')

    if (!diseaseNode) {
      return { disease: null, symptoms: [], drugs: [], examinations: [] }
    }

    const disease = diseaseNode.data as Disease
    const symptoms = knowledgeGraph.getDiseaseSymptoms(diseaseNode.id)
    const drugs = knowledgeGraph.getDiseaseDrugs(diseaseNode.id)
    const examinations = knowledgeGraph.getDiseaseExaminations(diseaseNode.id)

    return { disease, symptoms, drugs, examinations }
  }

  async buildEnhancedContext(params: {
    query: string
    symptoms?: string[]
    maxTokens?: number
  }): Promise<string> {
    const { query, symptoms = [], maxTokens = 2000 } = params

    const [searchResults, diagnosisResults] = await Promise.all([
      this.search({ query, topK: 5 }),
      symptoms.length > 0 ? this.diagnoseBySymptoms(symptoms) : Promise.resolve([])
    ])

    let context = ''
    let currentTokens = 0

    if (diagnosisResults.length > 0) {
      context += '【智能诊断参考】\n'
      for (const result of diagnosisResults.slice(0, 3)) {
        context += `可能疾病: ${result.disease.name}（匹配度: ${(result.score * 100).toFixed(0)}%）\n`
        context += `症状: ${result.disease.symptoms?.join('、') || '无'}\n`
        if (result.relatedDrugs.length > 0) {
          context += `常用药物: ${result.relatedDrugs.slice(0, 3).map(d => d.drug.name).join('、')}\n`
        }
        if (result.relatedExaminations.length > 0) {
          context += `建议检查: ${result.relatedExaminations.slice(0, 3).map(e => e.examination.name).join('、')}\n`
        }
        context += '\n'
      }
      currentTokens = Math.ceil(context.length / 4)
    }

    if (currentTokens < maxTokens) {
      context += '【相关知识】\n'
      for (const result of searchResults) {
        const tokens = Math.ceil(result.content.length / 4)
        if (currentTokens + tokens > maxTokens) break

        context += `来源: ${result.source}\n${result.content}\n\n`
        currentTokens += tokens
      }
    }

    return context.trim()
  }

  getStats(): {
    vectorWeight: number
    kgWeight: number
  } {
    return {
      vectorWeight: this.vectorWeight,
      kgWeight: this.kgWeight
    }
  }

  setWeights(vectorWeight: number, kgWeight: number): void {
    this.vectorWeight = vectorWeight
    this.kgWeight = kgWeight
  }
}
