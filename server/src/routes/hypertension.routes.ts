import type { FastifyInstance } from 'fastify'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { hypertensionService, type BloodPressureReading, type RiskAssessment, type TreatmentPlan } from '../services/hypertension.service'

interface AnalyzeBPRequest {
  patientId: string
  readings: Array<{
    systolic: number
    diastolic: number
    timestamp: string
    position?: 'sitting' | 'standing' | 'supine'
  }>
}

interface AssessRiskRequest {
  patientId: string
  profile: {
    age: number
    gender: 'male' | 'female'
    smoking?: boolean
    diabetes?: boolean
    cholesterol?: {
      total: number
      ldl: number
      hdl: number
    }
    familyHistory?: boolean
    kidneyDisease?: boolean
    establishedCVD?: boolean
  }
}

interface GenerateTreatmentPlanRequest {
  patientId: string
  currentBP: {
    systolic: number
    diastolic: number
  }
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high'
  comorbidities: string[]
  contraindications: string[]
  currentMedications?: string[]
}

interface ABPMAnalysisRequest {
  patientId: string
  abpmData: Array<{
    time: string
    systolic: number
    diastolic: number
  }>
}

export async function hypertensionRoutes(fastify: FastifyInstance) {
  fastify.get('/info', async (request: FastifyRequest, reply: FastifyReply) => {
    const info = hypertensionService.getServiceInfo()
    return {
      success: true,
      data: info
    }
  })

  fastify.post<{ Body: AnalyzeBPRequest }>(
    '/bp/analyze',
    async (request: FastifyRequest<{ Body: AnalyzeBPRequest }>, reply: FastifyReply) => {
      const { patientId, readings } = request.body

      if (!patientId || !readings || readings.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: patientId, readings'
        })
      }

      const analysis = hypertensionService.analyzeBloodPressure(patientId, readings)

      return {
        success: true,
        data: analysis,
        message: `血压分析完成，分类: ${analysis.classification}`
      }
    }
  )

  fastify.post<{ Body: AssessRiskRequest }>(
    '/risk/assess',
    async (request: FastifyRequest<{ Body: AssessRiskRequest }>, reply: FastifyReply) => {
      const { patientId, profile } = request.body

      if (!patientId || !profile) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: patientId, profile'
        })
      }

      const assessment = hypertensionService.assessCardiovascularRisk(patientId, profile)

      return {
        success: true,
        data: assessment,
        message: `心血管风险评估完成，10年风险: ${(assessment.tenYearRisk * 100).toFixed(1)}%`
      }
    }
  )

  fastify.post<{ Body: GenerateTreatmentPlanRequest }>(
    '/treatment/plan',
    async (request: FastifyRequest<{ Body: GenerateTreatmentPlanRequest }>, reply: FastifyReply) => {
      const { patientId, currentBP, riskLevel, comorbidities, contraindications, currentMedications } = request.body

      if (!patientId || !currentBP || !riskLevel) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: patientId, currentBP, riskLevel'
        })
      }

      const plan = hypertensionService.generateTreatmentPlan(
        patientId,
        currentBP,
        riskLevel,
        comorbidities,
        contraindications,
        currentMedications
      )

      return {
        success: true,
        data: plan,
        message: `治疗方案已生成，目标血压: ${plan.targetBP.systolic}/${plan.targetBP.diastolic} mmHg`
      }
    }
  )

  fastify.post<{ Body: ABPMAnalysisRequest }>(
    '/abpm/analyze',
    async (request: FastifyRequest<{ Body: ABPMAnalysisRequest }>, reply: FastifyReply) => {
      const { patientId, abpmData } = request.body

      if (!patientId || !abpmData || abpmData.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: patientId, abpmData'
        })
      }

      const analysis = hypertensionService.analyzeABPM(patientId, abpmData)

      return {
        success: true,
        data: analysis,
        message: `动态血压分析完成，模式: ${analysis.dipperPattern}`
      }
    }
  )

  fastify.get('/guidelines', async (request: FastifyRequest, reply: FastifyReply) => {
    const guidelines = hypertensionService.getGuidelines()
    return {
      success: true,
      data: guidelines
    }
  })

  fastify.get('/medications', async (request: FastifyRequest, reply: FastifyReply) => {
    const medications = hypertensionService.getMedicationList()
    return {
      success: true,
      data: medications
    }
  })

  fastify.get('/statistics', async (request: FastifyRequest, reply: FastifyReply) => {
    const stats = hypertensionService.getStatistics()
    return {
      success: true,
      data: stats
    }
  })

  fastify.post<{ Body: { patientId: string; systolic: number; diastolic: number } }>(
    '/lifestyle/recommend',
    async (request: FastifyRequest<{ Body: { patientId: string; systolic: number; diastolic: number } }>, reply: FastifyReply) => {
      const { patientId, systolic, diastolic } = request.body

      if (!patientId || systolic === undefined || diastolic === undefined) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: patientId, systolic, diastolic'
        })
      }

      const recommendations = hypertensionService.generateLifestyleRecommendations(patientId, systolic, diastolic)

      return {
        success: true,
        data: recommendations
      }
    }
  )
}
