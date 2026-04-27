import { PrismaClient } from '@prisma/client'
import { RAGService } from './rag.service.js'
import { RedisCacheService } from './redis-cache.service.js'
import { knowledgeGraph } from '../knowledge_graph/index.js'
import type { Disease, Drug, Examination, Symptom } from '../knowledge_graph/schema.js'

export class KnowledgeGraphRAGSync {
  private prisma: PrismaClient
  private ragService: RAGService

  constructor(prisma: PrismaClient, redisCache?: RedisCacheService) {
    this.prisma = prisma
    this.ragService = new RAGService(prisma, redisCache || new RedisCacheService())
  }

  async syncToRAG(): Promise<{ synced: number; categories: string[] }> {
    await knowledgeGraph.load()
    
    let synced = 0
    const categories = new Set<string>()

    const diseaseNodes = knowledgeGraph.getNodesByType('Disease')
    for (const node of diseaseNodes) {
      const disease = node.data as Disease
      const content = this.buildDiseaseContent(disease)
      
      await this.ragService.indexDocument({
        title: disease.name,
        content,
        source: `知识图谱 - 疾病: ${disease.name}`,
        category: 'disease',
        metadata: {
          type: 'disease',
          id: disease.id,
          departments: disease.departments,
          symptoms: disease.symptoms,
        },
      })
      
      synced++
      categories.add('disease')
    }

    const drugNodes = knowledgeGraph.getNodesByType('Drug')
    for (const node of drugNodes) {
      const drug = node.data as Drug
      const content = this.buildDrugContent(drug)
      
      await this.ragService.indexDocument({
        title: drug.name,
        content,
        source: `知识图谱 - 药品: ${drug.name}`,
        category: 'drug_info',
        metadata: {
          type: 'drug',
          id: drug.id,
          category: drug.category,
        },
      })
      
      synced++
      categories.add('drug_info')
    }

    const examNodes = knowledgeGraph.getNodesByType('Examination')
    for (const node of examNodes) {
      const exam = node.data as Examination
      const content = this.buildExaminationContent(exam)
      
      await this.ragService.indexDocument({
        title: exam.name,
        content,
        source: `知识图谱 - 检查: ${exam.name}`,
        category: 'examination',
        metadata: {
          type: 'examination',
          id: exam.id,
          category: exam.category,
        },
      })
      
      synced++
      categories.add('examination')
    }

    const symptomNodes = knowledgeGraph.getNodesByType('Symptom')
    for (const node of symptomNodes) {
      const symptom = node.data as Symptom
      const content = this.buildSymptomContent(symptom)
      
      await this.ragService.indexDocument({
        title: symptom.name,
        content,
        source: `知识图谱 - 症状: ${symptom.name}`,
        category: 'symptom',
        metadata: {
          type: 'symptom',
          id: symptom.id,
          severity: symptom.severityLevel,
        },
      })
      
      synced++
      categories.add('symptom')
    }

    return {
      synced,
      categories: Array.from(categories),
    }
  }

  private buildDiseaseContent(disease: Disease): string {
    const parts = [
      `# ${disease.name}`,
      '',
      `## 基本信息`,
      `- ID: ${disease.id}`,
      `- 科室: ${disease.departments?.join('、') || '未知'}`,
      '',
      `## 描述`,
      disease.description || '暂无详细描述',
    ]

    if (disease.symptoms && disease.symptoms.length > 0) {
      parts.push('', `## 常见症状`, disease.symptoms.map((s: string) => `- ${s}`).join('\n'))
    }

    if (disease.causes && disease.causes.length > 0) {
      parts.push('', `## 病因`, disease.causes.map((c: string) => `- ${c}`).join('\n'))
    }

    if (disease.prevention && disease.prevention.length > 0) {
      parts.push('', `## 预防措施`, disease.prevention.map((p: string) => `- ${p}`).join('\n'))
    }

    if (disease.complications && disease.complications.length > 0) {
      parts.push('', `## 并发症`, disease.complications.map((c: string) => `- ${c}`).join('\n'))
    }

    return parts.join('\n')
  }

  private buildDrugContent(drug: Drug): string {
    const parts = [
      `# ${drug.name}`,
      '',
      `## 基本信息`,
      `- ID: ${drug.id}`,
      `- 分类: ${drug.category || '未知'}`,
    ]

    if (drug.genericName) {
      parts.push(`- 通用名: ${drug.genericName}`)
    }

    if (drug.indications && drug.indications.length > 0) {
      parts.push('', `## 适应症`, drug.indications.map((i: string) => `- ${i}`).join('\n'))
    }

    if (drug.contraindications && drug.contraindications.length > 0) {
      parts.push('', `## 禁忌症`, drug.contraindications.map((c: string) => `- ${c}`).join('\n'))
    }

    if (drug.sideEffects && drug.sideEffects.length > 0) {
      parts.push('', `## 副作用`, drug.sideEffects.map((s: string) => `- ${s}`).join('\n'))
    }

    if (drug.dosage) {
      const dosageInfo = `成人: ${drug.dosage.adult}，频率: ${drug.dosage.frequency}`
      parts.push('', `## 用法用量`, dosageInfo)
    }

    if (drug.storage) {
      parts.push('', `## 储存条件`, drug.storage)
    }

    return parts.join('\n')
  }

  private buildExaminationContent(exam: Examination): string {
    const parts = [
      `# ${exam.name}`,
      '',
      `## 基本信息`,
      `- ID: ${exam.id}`,
      `- 分类: ${exam.category || '未知'}`,
    ]

    if (exam.normalRange && exam.normalRange.length > 0) {
      const rangeStr = exam.normalRange.map(r => {
        if (r.min !== undefined && r.max !== undefined) {
          return `${r.min}-${r.max} ${r.unit}`
        }
        return r.description || `${r.unit}`
      }).join('、')
      parts.push(`- 正常范围: ${rangeStr}`)
    }

    if (exam.clinicalSignificance) {
      parts.push('', `## 临床意义`, exam.clinicalSignificance)
    }

    if (exam.preparationRequired && exam.preparationRequired.length > 0) {
      parts.push('', `## 检查前准备`, exam.preparationRequired.map((p: string) => `- ${p}`).join('\n'))
    }

    if (exam.relatedDiseases && exam.relatedDiseases.length > 0) {
      parts.push('', `## 相关疾病`, exam.relatedDiseases.map((d: string) => `- ${d}`).join('\n'))
    }

    return parts.join('\n')
  }

  private buildSymptomContent(symptom: Symptom): string {
    const parts = [
      `# ${symptom.name}`,
      '',
      `## 基本信息`,
      `- ID: ${symptom.id}`,
      `- 严重程度: ${symptom.severityLevel || '未知'}`,
    ]

    if (symptom.description) {
      parts.push('', `## 症状描述`, symptom.description)
    }

    if (symptom.possibleDiseases && symptom.possibleDiseases.length > 0) {
      parts.push('', `## 可能相关疾病`, symptom.possibleDiseases.map((d: string) => `- ${d}`).join('\n'))
    }

    if (symptom.relatedBodyParts && symptom.relatedBodyParts.length > 0) {
      parts.push('', `## 相关部位`, symptom.relatedBodyParts.join('、'))
    }

    return parts.join('\n')
  }

  async getSyncStatus(): Promise<{
    totalInGraph: number
    totalInRAG: number
    categories: Record<string, { graph: number; rag: number }>
  }> {
    await knowledgeGraph.load()
    const stats = knowledgeGraph.getStats()
    
    const totalInGraph = stats.nodeTypeCounts.Disease + 
      stats.nodeTypeCounts.Drug + 
      stats.nodeTypeCounts.Examination + 
      stats.nodeTypeCounts.Symptom

    const ragStats = await this.ragService.getDocumentStats()
    
    const categories: Record<string, { graph: number; rag: number }> = {
      disease: { graph: stats.nodeTypeCounts.Disease, rag: 0 },
      drug_info: { graph: stats.nodeTypeCounts.Drug, rag: 0 },
      examination: { graph: stats.nodeTypeCounts.Examination, rag: 0 },
      symptom: { graph: stats.nodeTypeCounts.Symptom, rag: 0 },
    }

    const documents = await this.prisma.knowledgeDocument.findMany({
      select: { category: true },
    })

    for (const doc of documents) {
      if (doc.category && categories[doc.category]) {
        categories[doc.category].rag++
      }
    }

    return {
      totalInGraph,
      totalInRAG: ragStats.totalDocuments,
      categories,
    }
  }
}
