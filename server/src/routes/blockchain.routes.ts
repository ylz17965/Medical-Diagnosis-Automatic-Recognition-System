import type { FastifyInstance } from 'fastify'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { blockchainService, type AttestationRecord, type VerificationResult } from '../services/blockchain.service'

interface AttestAdviceRequest {
  adviceId: string
  adviceContent: string
  patientId: string
  doctorVerified?: boolean
  patientConsent?: boolean
}

interface VerifyAdviceRequest {
  adviceId: string
  currentContent: string
}

interface GetAttestationRequest {
  adviceId: string
}

export async function blockchainRoutes(fastify: FastifyInstance) {
  fastify.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const status = blockchainService.getStatus()
    return {
      success: true,
      data: status
    }
  })

  fastify.post<{ Body: AttestAdviceRequest }>(
    '/attest',
    async (request: FastifyRequest<{ Body: AttestAdviceRequest }>, reply: FastifyReply) => {
      const { adviceId, adviceContent, patientId, doctorVerified, patientConsent } = request.body

      if (!adviceId || !adviceContent || !patientId) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: adviceId, adviceContent, patientId'
        })
      }

      const result = await blockchainService.attestAdvice({
        adviceId,
        adviceContent,
        patientId,
        doctorVerified: doctorVerified || false,
        patientConsent: patientConsent || false
      })

      return {
        success: true,
        data: result,
        message: `医疗建议已上链存证，交易哈希: ${result.txHash}`
      }
    }
  )

  fastify.post<{ Body: VerifyAdviceRequest }>(
    '/verify',
    async (request: FastifyRequest<{ Body: VerifyAdviceRequest }>, reply: FastifyReply) => {
      const { adviceId, currentContent } = request.body

      if (!adviceId || !currentContent) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: adviceId, currentContent'
        })
      }

      const result = blockchainService.verifyAdvice(adviceId, currentContent)

      return {
        success: true,
        data: result,
        message: result.verified
          ? '内容完整性验证通过，数据未被篡改'
          : '警告：内容已被修改，与链上记录不符'
      }
    }
  )

  fastify.get<{ Params: { adviceId: string } }>(
    '/attestations/:adviceId',
    async (request: FastifyRequest<{ Params: { adviceId: string } }>, reply: FastifyReply) => {
      const { adviceId } = request.params
      const attestation = blockchainService.getAttestation(adviceId)

      if (!attestation) {
        return reply.status(404).send({
          success: false,
          error: `Attestation not found: ${adviceId}`
        })
      }

      return {
        success: true,
        data: attestation
      }
    }
  )

  fastify.get('/attestations', async (request: FastifyRequest, reply: FastifyReply) => {
    const attestations = blockchainService.getAllAttestations()
    return {
      success: true,
      data: attestations,
      total: attestations.length
    }
  })

  fastify.get<{ Params: { patientId: string } }>(
    '/patients/:patientId/attestations',
    async (request: FastifyRequest<{ Params: { patientId: string } }>, reply: FastifyReply) => {
      const { patientId } = request.params
      const attestations = blockchainService.getPatientAttestations(patientId)

      return {
        success: true,
        data: attestations,
        total: attestations.length
      }
    }
  )

  fastify.get('/blocks/latest', async (request: FastifyRequest, reply: FastifyReply) => {
    const blocks = blockchainService.getLatestBlocks(10)
    return {
      success: true,
      data: blocks,
      total: blocks.length
    }
  })

  fastify.get<{ Params: { blockNumber: string } }>(
    '/blocks/:blockNumber',
    async (request: FastifyRequest<{ Params: { blockNumber: string } }>, reply: FastifyReply) => {
      const blockNumber = parseInt(request.params.blockNumber, 10)
      
      if (isNaN(blockNumber)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid block number'
        })
      }

      const block = blockchainService.getBlock(blockNumber)

      if (!block) {
        return reply.status(404).send({
          success: false,
          error: `Block not found: ${blockNumber}`
        })
      }

      return {
        success: true,
        data: block
      }
    }
  )

  fastify.get('/statistics', async (request: FastifyRequest, reply: FastifyReply) => {
    const stats = blockchainService.getStatistics()
    return {
      success: true,
      data: stats
    }
  })

  fastify.post<{ Body: { adviceId: string; doctorId: string } }>(
    '/verify-doctor',
    async (request: FastifyRequest<{ Body: { adviceId: string; doctorId: string } }>, reply: FastifyReply) => {
      const { adviceId, doctorId } = request.body

      if (!adviceId || !doctorId) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: adviceId, doctorId'
        })
      }

      const result = blockchainService.doctorVerify(adviceId, doctorId)

      return {
        success: result.success,
        data: result,
        message: result.success
          ? `医生 ${doctorId} 已验证该建议`
          : '验证失败'
      }
    }
  )

  fastify.get('/audit-trail/:adviceId', async (request: FastifyRequest<{ Params: { adviceId: string } }>, reply: FastifyReply) => {
    const { adviceId } = request.params
    const trail = blockchainService.getAuditTrail(adviceId)

    return {
      success: true,
      data: trail
    }
  })
}
