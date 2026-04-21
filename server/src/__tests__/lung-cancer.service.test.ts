import { describe, it, expect, beforeEach } from 'vitest'
import { lungCancerService } from '../services/lung-cancer.service.js'

describe('LungCancerService', () => {
  beforeEach(() => {
  })

  describe('getServiceInfo', () => {
    it('should return service information', () => {
      const info = lungCancerService.getServiceInfo()

      expect(info.name).toBe('肺癌早筛专科推理引擎')
      expect(info.version).toBe('1.0.0')
      expect(info.guidelines).toContain('Fleischner 2025')
      expect(info.guidelines).toContain('NCCN 2025')
      expect(info.capabilities.length).toBeGreaterThan(0)
    })
  })

  describe('analyzeNodule', () => {
    it('should analyze solid nodule correctly', () => {
      const result = lungCancerService.analyzeNodule(
        'patient-001',
        {
          size: 8,
          location: '右肺上叶',
          type: 'solid',
        },
        {
          age: 55,
          smokingHistory: 'current',
          packYears: 30,
        }
      )

      expect(result.noduleId).toBeDefined()
      expect(result.malignancyRisk).toBeGreaterThan(0)
      expect(result.malignancyRisk).toBeLessThanOrEqual(1)
      expect(['very_low', 'low', 'moderate', 'high']).toContain(result.riskCategory)
      expect(result.management).toBeDefined()
      expect(result.management.recommendation).toBeDefined()
    })

    it('should classify very small nodules as very low risk', () => {
      const result = lungCancerService.analyzeNodule(
        'patient-002',
        {
          size: 4,
          location: '左肺下叶',
          type: 'solid',
        },
        {
          age: 40,
          smokingHistory: 'never',
        }
      )

      expect(['very_low', 'low']).toContain(result.riskCategory)
    })

    it('should classify large nodules as high risk', () => {
      const result = lungCancerService.analyzeNodule(
        'patient-003',
        {
          size: 25,
          location: '右肺中叶',
          type: 'solid',
          spiculation: true,
        },
        {
          age: 70,
          smokingHistory: 'current',
          packYears: 40,
          familyHistory: true,
        }
      )

      expect(result.riskCategory).toBe('high')
      expect(result.management.biopsy).toBe(true)
    })

    it('should handle ground glass nodules', () => {
      const result = lungCancerService.analyzeNodule(
        'patient-004',
        {
          size: 15,
          location: '左肺上叶',
          type: 'ground_glass',
        },
        {
          age: 50,
          smokingHistory: 'former',
        }
      )

      expect(result.malignancyRisk).toBeDefined()
      expect(result.fleischnerGuideline).toBeDefined()
    })

    it('should handle calcified nodules as benign', () => {
      const result = lungCancerService.analyzeNodule(
        'patient-005',
        {
          size: 10,
          location: '右肺下叶',
          type: 'calcified',
        },
        {
          age: 60,
          smokingHistory: 'never',
        }
      )

      expect(result.riskCategory).toBe('very_low')
      expect(result.fleischnerGuideline).toContain('良性')
    })
  })

  describe('determineTNMStaging', () => {
    it('should stage T1N0M0 correctly', () => {
      const staging = lungCancerService.determineTNMStaging(
        'patient-001',
        25,
        'none',
        'none',
        'peripheral'
      )

      expect(staging.tnmStage).toBe('T1N0M0')
      expect(staging.clinicalStage).toBe('IA')
      expect(staging.prognosis.fiveYearSurvival).toBe(0.92)
    })

    it('should stage T2N0M0 correctly', () => {
      const staging = lungCancerService.determineTNMStaging(
        'patient-002',
        40,
        'none',
        'none',
        'peripheral'
      )

      expect(staging.tnmStage).toBe('T2N0M0')
      expect(staging.clinicalStage).toBe('IB')
    })

    it('should stage with lymph node involvement', () => {
      const staging = lungCancerService.determineTNMStaging(
        'patient-003',
        25,
        'hilar',
        'none',
        'central'
      )

      expect(staging.tnmStage).toBe('T1N1M0')
      expect(staging.clinicalStage).toBe('IIA')
    })

    it('should stage metastatic disease as Stage IV', () => {
      const staging = lungCancerService.determineTNMStaging(
        'patient-004',
        50,
        'mediastinal',
        'present',
        'peripheral'
      )

      expect(staging.clinicalStage).toBe('IV')
      expect(staging.prognosis.fiveYearSurvival).toBe(0.05)
    })
  })

  describe('generateScreeningPlan', () => {
    it('should generate high risk screening plan', () => {
      const plan = lungCancerService.generateScreeningPlan('patient-001', {
        age: 65,
        smokingHistory: 'current',
        packYears: 40,
        familyHistory: true,
        copdHistory: true,
      })

      expect(plan.riskLevel).toBe('high')
      expect(plan.screeningMethod).toContain('LDCT')
      expect(plan.interval).toContain('每年')
    })

    it('should generate moderate risk screening plan', () => {
      const plan = lungCancerService.generateScreeningPlan('patient-002', {
        age: 55,
        smokingHistory: 'former',
        packYears: 25,
      })

      expect(['moderate', 'high']).toContain(plan.riskLevel)
    })

    it('should generate low risk screening plan', () => {
      const plan = lungCancerService.generateScreeningPlan('patient-003', {
        age: 40,
        smokingHistory: 'never',
      })

      expect(plan.riskLevel).toBe('low')
      expect(plan.interval).toContain('2年')
    })
  })

  describe('getDrugsForMutation', () => {
    it('should return treatment for EGFR mutation', () => {
      const treatment = lungCancerService.getDrugsForMutation('EGFR_exon19del')

      expect(treatment).not.toBeNull()
      expect(treatment?.mutation).toContain('EGFR')
      expect(treatment?.firstLine).toContain('奥希替尼(首选)')
      expect(treatment?.evidenceLevel).toBe('1A')
    })

    it('should return treatment for ALK fusion', () => {
      const treatment = lungCancerService.getDrugsForMutation('ALK_fusion')

      expect(treatment).not.toBeNull()
      expect(treatment?.firstLine).toContain('阿来替尼(首选)')
    })

    it('should return treatment for KRAS G12C', () => {
      const treatment = lungCancerService.getDrugsForMutation('KRAS_G12C')

      expect(treatment).not.toBeNull()
      expect(treatment?.firstLine).toContain('索托拉西布')
    })

    it('should return null for unknown mutation', () => {
      const treatment = lungCancerService.getDrugsForMutation('UNKNOWN_MUTATION')

      expect(treatment).toBeNull()
    })
  })

  describe('recommendPrecisionTreatment', () => {
    it('should recommend treatment for known mutation', () => {
      const recommendation = lungCancerService.recommendPrecisionTreatment(
        'patient-001',
        'EGFR_exon19del'
      )

      expect(recommendation.patientId).toBe('patient-001')
      expect(recommendation.recommendation).toContain('奥希替尼')
    })

    it('should recommend standard treatment for unknown mutation', () => {
      const recommendation = lungCancerService.recommendPrecisionTreatment(
        'patient-002',
        'UNKNOWN'
      )

      expect(recommendation.firstLine).toContain('化疗')
      expect(recommendation.recommendation).toContain('标准化疗')
    })
  })

  describe('getGuidelines', () => {
    it('should return all guidelines', () => {
      const guidelines = lungCancerService.getGuidelines()

      expect(guidelines.fleischner2025).toBeDefined()
      expect(guidelines.nccn2025).toBeDefined()
      expect(guidelines.csco2025).toBeDefined()
    })
  })

  describe('getStatistics', () => {
    it('should return service statistics', () => {
      const stats = lungCancerService.getStatistics()

      expect(stats).toHaveProperty('totalNodulesAnalyzed')
      expect(stats).toHaveProperty('totalStagings')
      expect(stats).toHaveProperty('totalScreeningPlans')
      expect(stats).toHaveProperty('highRiskCases')
    })
  })
})
