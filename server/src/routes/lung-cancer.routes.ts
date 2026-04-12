import type { FastifyInstance } from 'fastify'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { lungCancerService, type LungNodule, type TNMStaging, type ScreeningPlan, type TreatmentRecommendation } from '../services/lung-cancer.service'

interface AnalyzeNoduleRequest {
  patientId: string
  noduleData: {
    size: number
    location: string
    type: 'solid' | 'subsolid' | 'ground_glass' | 'calcified'
    spiculation?: boolean
    margin?: number
  }
  patientHistory: {
    age: number
    smokingHistory: 'never' | 'former' | 'current'
    packYears?: number
    familyHistory?: boolean
    copdHistory?: boolean
  }
}

interface TNMStagingRequest {
  patientId: string
  tumorSize: number
  lymphNodeInvolvement: 'none' | 'hilar' | 'mediastinal'
  metastasis: 'none' | 'present'
  tumorLocation: 'central' | 'peripheral'
}

interface GenerateScreeningPlanRequest {
  patientId: string
  riskFactors: {
    age: number
    smokingHistory: string
    packYears?: number
    familyHistory?: boolean
    copdHistory?: boolean
    exposureHistory?: string
  }
}

export async function lungCancerRoutes(fastify: FastifyInstance) {
  fastify.get('/info', async (request: FastifyRequest, reply: FastifyReply) => {
    const info = lungCancerService.getServiceInfo()
    return {
      success: true,
      data: info
    }
  })

  fastify.post<{ Body: AnalyzeNoduleRequest }>(
    '/nodule/analyze',
    async (request: FastifyRequest<{ Body: AnalyzeNoduleRequest }>, reply: FastifyReply) => {
      const { patientId, noduleData, patientHistory } = request.body

      if (!patientId || !noduleData) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: patientId, noduleData'
        })
      }

      const analysis = lungCancerService.analyzeNodule(
        patientId,
        noduleData,
        patientHistory
      )

      return {
        success: true,
        data: analysis,
        message: `肺结节分析完成，恶性风险: ${(analysis.malignancyRisk * 100).toFixed(1)}%`
      }
    }
  )

  fastify.post<{ Body: TNMStagingRequest }>(
    '/staging/tnm',
    async (request: FastifyRequest<{ Body: TNMStagingRequest }>, reply: FastifyReply) => {
      const { patientId, tumorSize, lymphNodeInvolvement, metastasis, tumorLocation } = request.body

      if (!patientId || tumorSize === undefined || !lymphNodeInvolvement || !metastasis) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: patientId, tumorSize, lymphNodeInvolvement, metastasis'
        })
      }

      const staging = lungCancerService.determineTNMStaging(
        patientId,
        tumorSize,
        lymphNodeInvolvement,
        metastasis,
        tumorLocation
      )

      return {
        success: true,
        data: staging,
        message: `TNM分期: ${staging.tnmStage}，临床分期: ${staging.clinicalStage}`
      }
    }
  )

  fastify.post<{ Body: GenerateScreeningPlanRequest }>(
    '/screening/plan',
    async (request: FastifyRequest<{ Body: GenerateScreeningPlanRequest }>, reply: FastifyReply) => {
      const { patientId, riskFactors } = request.body

      if (!patientId || !riskFactors) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: patientId, riskFactors'
        })
      }

      const plan = lungCancerService.generateScreeningPlan(patientId, riskFactors)

      return {
        success: true,
        data: plan,
        message: `筛查计划已生成，建议: ${plan.recommendation}`
      }
    }
  )

  fastify.get('/guidelines', async (request: FastifyRequest, reply: FastifyReply) => {
    const guidelines = lungCancerService.getGuidelines()
    return {
      success: true,
      data: guidelines
    }
  })

  fastify.get('/mutations/:mutationId/drugs', async (request: FastifyRequest<{ Params: { mutationId: string } }>, reply: FastifyReply) => {
    const { mutationId } = request.params
    const drugs = lungCancerService.getDrugsForMutation(mutationId)

    return {
      success: true,
      data: drugs
    }
  })

  fastify.post<{ Body: { patientId: string; mutation: string } }>(
    '/precision-medicine/recommend',
    async (request: FastifyRequest<{ Body: { patientId: string; mutation: string } }>, reply: FastifyReply) => {
      const { patientId, mutation } = request.body

      if (!patientId || !mutation) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: patientId, mutation'
        })
      }

      const recommendation = lungCancerService.recommendPrecisionTreatment(patientId, mutation)

      return {
        success: true,
        data: recommendation
      }
    }
  )

  fastify.get('/statistics', async (request: FastifyRequest, reply: FastifyReply) => {
    const stats = lungCancerService.getStatistics()
    return {
      success: true,
      data: stats
    }
  })
}
