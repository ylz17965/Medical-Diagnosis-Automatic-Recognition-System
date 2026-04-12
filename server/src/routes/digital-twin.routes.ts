import type { FastifyInstance } from 'fastify'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { digitalTwinService, type OrganModel, type HealthIndicator, type RiskAssessment } from '../services/digital-twin.service'

interface GenerateTwinRequest {
  patientId: string
  healthRecords: {
    labResults?: Array<{ name: string; value: number; unit: string; normalRange: [number, number] }>
    vitalSigns?: Array<{ name: string; value: number; unit: string }>
    diagnoses?: string[]
    medications?: string[]
  }
}

interface OverlayDiseaseRequest {
  patientId: string
  diseaseId: string
}

interface UpdateOrganRequest {
  patientId: string
  organId: string
  status: 'normal' | 'warning' | 'critical'
  indicators: string[]
}

export async function digitalTwinRoutes(fastify: FastifyInstance) {
  fastify.get('/organs', async (request: FastifyRequest, reply: FastifyReply) => {
    const organs = digitalTwinService.getAvailableOrgans()
    return {
      success: true,
      data: organs,
      total: organs.length
    }
  })

  fastify.get('/organs/:organId', async (request: FastifyRequest<{ Params: { organId: string } }>, reply: FastifyReply) => {
    const { organId } = request.params
    const organ = digitalTwinService.getOrganModel(organId)

    if (!organ) {
      return reply.status(404).send({
        success: false,
        error: `Organ not found: ${organId}`
      })
    }

    return {
      success: true,
      data: organ
    }
  })

  fastify.post<{ Body: GenerateTwinRequest }>(
    '/generate',
    async (request: FastifyRequest<{ Body: GenerateTwinRequest }>, reply: FastifyReply) => {
      const { patientId, healthRecords } = request.body

      if (!patientId) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required field: patientId'
        })
      }

      const twin = digitalTwinService.generateDigitalTwin(patientId, healthRecords)

      return {
        success: true,
        data: twin,
        message: `数字孪生已生成，共 ${twin.organs.length} 个器官模型`
      }
    }
  )

  fastify.get<{ Params: { patientId: string } }>(
    '/patients/:patientId',
    async (request: FastifyRequest<{ Params: { patientId: string } }>, reply: FastifyReply) => {
      const { patientId } = request.params
      const twin = digitalTwinService.getPatientTwin(patientId)

      if (!twin) {
        return reply.status(404).send({
          success: false,
          error: `Patient twin not found: ${patientId}`
        })
      }

      return {
        success: true,
        data: twin
      }
    }
  )

  fastify.post<{ Body: OverlayDiseaseRequest }>(
    '/overlay-disease',
    async (request: FastifyRequest<{ Body: OverlayDiseaseRequest }>, reply: FastifyReply) => {
      const { patientId, diseaseId } = request.body

      if (!patientId || !diseaseId) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: patientId, diseaseId'
        })
      }

      const result = digitalTwinService.overlayDisease(patientId, diseaseId)

      return {
        success: true,
        data: result,
        message: `疾病 ${diseaseId} 已叠加到数字孪生`
      }
    }
  )

  fastify.post<{ Body: UpdateOrganRequest }>(
    '/update-organ',
    async (request: FastifyRequest<{ Body: UpdateOrganRequest }>, reply: FastifyReply) => {
      const { patientId, organId, status, indicators } = request.body

      if (!patientId || !organId || !status) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: patientId, organId, status'
        })
      }

      const result = digitalTwinService.updateOrganStatus(patientId, organId, status, indicators)

      return {
        success: true,
        data: result
      }
    }
  )

  fastify.get<{ Params: { patientId: string } }>(
    '/patients/:patientId/risk-assessment',
    async (request: FastifyRequest<{ Params: { patientId: string } }>, reply: FastifyReply) => {
      const { patientId } = request.params
      const assessment = digitalTwinService.assessRisk(patientId)

      return {
        success: true,
        data: assessment
      }
    }
  )

  fastify.get<{ Params: { patientId: string } }>(
    '/patients/:patientId/export',
    async (request: FastifyRequest<{ Params: { patientId: string } }>, reply: FastifyReply) => {
      const { patientId } = request.params
      const exportData = digitalTwinService.exportModel(patientId)

      return {
        success: true,
        data: exportData,
        message: '3D模型导出成功'
      }
    }
  )

  fastify.get('/indicators/mapping', async (request: FastifyRequest, reply: FastifyReply) => {
    const mapping = digitalTwinService.getIndicatorMapping()
    return {
      success: true,
      data: mapping
    }
  })

  fastify.get('/statistics', async (request: FastifyRequest, reply: FastifyReply) => {
    const stats = digitalTwinService.getStatistics()
    return {
      success: true,
      data: stats
    }
  })
}
