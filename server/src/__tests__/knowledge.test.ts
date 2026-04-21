import { describe, it, expect } from 'vitest'
import { knowledgeGraphService } from '../knowledge_graph/service.js'
import { searchLungKnowledge, getLungKnowledgeStatistics, LUNG_KNOWLEDGE_DOCUMENTS } from '../knowledge_base/lung_knowledge.js'

describe('Knowledge Graph Service', () => {
  describe('Statistics', () => {
    it('should return correct statistics', () => {
      const stats = knowledgeGraphService.getStatistics()
      expect(stats.totalDiseases).toBeGreaterThanOrEqual(30)
      expect(stats.totalSymptoms).toBeGreaterThanOrEqual(30)
      expect(stats.totalDrugs).toBeGreaterThanOrEqual(30)
      expect(stats.totalExaminations).toBeGreaterThanOrEqual(10)
      expect(stats.totalRelations).toBeGreaterThanOrEqual(100)
      expect(stats.lungRelatedDiseases).toBeGreaterThanOrEqual(25)
    })
  })

  describe('Disease Search', () => {
    it('should find lung cancer by name', () => {
      const results = knowledgeGraphService.searchDiseases('肺癌')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(d => d.name === '肺癌')).toBe(true)
    })

    it('should find diseases by symptom', () => {
      const results = knowledgeGraphService.searchDiseases('咳嗽')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should find diseases by alias', () => {
      const results = knowledgeGraphService.searchDiseases('COPD')
      expect(results.some(d => d.name === '慢性阻塞性肺疾病')).toBe(true)
    })
  })

  describe('Symptom Search', () => {
    it('should find cough symptom', () => {
      const results = knowledgeGraphService.searchSymptoms('咳嗽')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].name).toBe('咳嗽')
    })

    it('should find symptom by alias', () => {
      const results = knowledgeGraphService.searchSymptoms('cough')
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('Drug Search', () => {
    it('should find osimertinib', () => {
      const results = knowledgeGraphService.searchDrugs('奥希替尼')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].genericName).toBe('Osimertinib')
    })

    it('should find drugs by indication', () => {
      const results = knowledgeGraphService.searchDrugs('肺癌')
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('Disease Relations', () => {
    it('should get symptoms for lung cancer', () => {
      const disease = knowledgeGraphService.getDiseaseById('D002')
      expect(disease).toBeDefined()
      expect(disease?.name).toBe('肺癌')
      
      const symptoms = knowledgeGraphService.getDiseaseSymptoms('D002')
      expect(symptoms.length).toBeGreaterThan(0)
      expect(symptoms.some(s => s.name === '咳嗽')).toBe(true)
    })

    it('should get drugs for lung cancer', () => {
      const drugs = knowledgeGraphService.getDiseaseDrugs('D002')
      expect(drugs.length).toBeGreaterThan(0)
      expect(drugs.some(d => d.genericName === 'Osimertinib')).toBe(true)
    })

    it('should get examinations for lung cancer', () => {
      const exams = knowledgeGraphService.getDiseaseExaminations('D002')
      expect(exams.length).toBeGreaterThan(0)
      expect(exams.some(e => e.name === '胸部CT')).toBe(true)
    })
  })

  describe('Symptom Analysis', () => {
    it('should analyze symptoms and return possible diseases', () => {
      const result = knowledgeGraphService.analyzeSymptoms(['咳嗽', '咯血', '胸痛'])
      expect(result.possibleDiseases.length).toBeGreaterThan(0)
      expect(result.possibleDiseases[0].probability).toBeGreaterThan(0)
      expect(result.possibleDiseases[0].matchedSymptoms.length).toBeGreaterThan(0)
    })

    it('should recommend examinations based on symptoms', () => {
      const result = knowledgeGraphService.analyzeSymptoms(['咳嗽', '发热'])
      expect(result.recommendedExaminations.length).toBeGreaterThan(0)
    })

    it('should recommend departments based on symptoms', () => {
      const result = knowledgeGraphService.analyzeSymptoms(['咳嗽', '呼吸困难'])
      expect(result.recommendedDepartments.length).toBeGreaterThan(0)
    })
  })

  describe('Drug Information', () => {
    it('should get drug interactions', () => {
      const interactions = knowledgeGraphService.getDrugInteractions('DR001')
      expect(interactions.length).toBeGreaterThan(0)
    })

    it('should get drug side effects', () => {
      const sideEffects = knowledgeGraphService.getDrugSideEffects('DR001')
      expect(sideEffects.length).toBeGreaterThan(0)
      expect(sideEffects).toContain('腹泻')
    })
  })
})

describe('Lung Knowledge Base', () => {
  describe('Statistics', () => {
    it('should return correct statistics', () => {
      const stats = getLungKnowledgeStatistics()
      expect(stats.totalDocuments).toBeGreaterThanOrEqual(10)
      expect(stats.categories.guideline).toBeGreaterThan(0)
      expect(stats.allTags.length).toBeGreaterThan(10)
    })
  })

  describe('Search', () => {
    it('should find documents by title', () => {
      const results = searchLungKnowledge('肺结节')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(d => d.title.includes('肺结节'))).toBe(true)
    })

    it('should find documents by tag', () => {
      const results = searchLungKnowledge('TNM分期')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should find documents by content', () => {
      const results = searchLungKnowledge('EGFR')
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('Document Content', () => {
    it('should have Fleischner guideline', () => {
      const doc = LUNG_KNOWLEDGE_DOCUMENTS.find(d => d.id === 'LK001')
      expect(doc).toBeDefined()
      expect(doc?.title).toContain('Fleischner')
      expect(doc?.tags).toContain('肺结节')
    })

    it('should have TNM staging guideline', () => {
      const doc = LUNG_KNOWLEDGE_DOCUMENTS.find(d => d.id === 'LK002')
      expect(doc).toBeDefined()
      expect(doc?.title).toContain('TNM')
    })

    it('should have EGFR treatment guideline', () => {
      const doc = LUNG_KNOWLEDGE_DOCUMENTS.find(d => d.id === 'LK003')
      expect(doc).toBeDefined()
      expect(doc?.title).toContain('EGFR')
    })
  })
})
