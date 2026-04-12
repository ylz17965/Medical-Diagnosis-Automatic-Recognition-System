import type { FastifyInstance } from 'fastify'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { federatedLearningService, type HospitalNode, type FederatedSearchResult } from '../services/federated.service'

const registerHospitalSchema = z.object({
  hospitalId: z.string().min(1, '医院ID不能为空'),
  name: z.string().min(1, '医院名称不能为空'),
  publicKey: z.string().min(1, '公钥不能为空'),
  endpoint: z.string().url().optional(),
})

const federatedSearchSchema = z.object({
  query: z.string().min(1, '查询内容不能为空').max(2000),
  hospitalFilter: z.array(z.string()).optional(),
  privacyEpsilon: z.number().min(0).max(10).optional(),
  maxResults: z.number().int().min(1).max(100).optional(),
})

const aggregateSchema = z.object({
  roundId: z.string().min(1, '轮次ID不能为空'),
  localModels: z.array(z.object({
    hospitalId: z.string(),
    modelUpdate: z.array(z.number()),
    sampleCount: z.number().int().min(0),
  })).min(1, '至少需要一个本地模型'),
})

const privacyBudgetConsumeSchema = z.object({
  amount: z.number().positive('消耗量必须为正数'),
})

const dataIntegritySchema = z.object({
  hospitalId: z.string().min(1, '医院ID不能为空'),
  dataHash: z.string().min(1, '数据哈希不能为空'),
})

const sourcesSchema = z.array(z.object({
  type: z.enum(['vector', 'knowledge_graph']),
  source: z.string(),
  content: z.string(),
  score: z.number().min(0).max(1),
}))

export async function federatedRoutes(fastify: FastifyInstance) {
  fastify.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const status = federatedLearningService.getStatus()
    return {
      success: true,
      data: status
    }
  })

  fastify.post<{ Body: z.infer<typeof registerHospitalSchema> }>(
    '/hospitals/register',
    async (request: FastifyRequest<{ Body: z.infer<typeof registerHospitalSchema> }>, reply: FastifyReply) => {
      const parseResult = registerHospitalSchema.safeParse(request.body)
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: parseResult.error.errors[0].message
        })
      }
      const { hospitalId, name, publicKey, endpoint } = parseResult.data

      const hospital = federatedLearningService.registerHospital({
        id: hospitalId,
        name,
        publicKey,
        endpoint: endpoint || `https://${hospitalId}.federated.local`
      })

      return {
        success: true,
        data: hospital,
        message: `医院 ${name} 已成功注册到联邦学习网络`
      }
    }
  )

  fastify.get('/hospitals', async (request: FastifyRequest, reply: FastifyReply) => {
    const hospitals = federatedLearningService.getHospitals()
    return {
      success: true,
      data: hospitals,
      total: hospitals.length
    }
  })

  fastify.post<{ Body: z.infer<typeof federatedSearchSchema> }>(
    '/search',
    async (request: FastifyRequest<{ Body: z.infer<typeof federatedSearchSchema> }>, reply: FastifyReply) => {
      const parseResult = federatedSearchSchema.safeParse(request.body)
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: parseResult.error.errors[0].message
        })
      }
      const { query, hospitalFilter, privacyEpsilon, maxResults } = parseResult.data

      const result = await federatedLearningService.federatedSearch({
        query,
        hospitalFilter,
        privacyEpsilon: privacyEpsilon || 0.1,
        maxResults: maxResults || 10
      })

      return {
        success: true,
        data: result,
        message: `联邦检索完成，涉及 ${result.participatingHospitals} 家医院，隐私保护等级: ε=${privacyEpsilon || 0.1}`
      }
    }
  )

  fastify.post<{ Body: z.infer<typeof aggregateSchema> }>(
    '/aggregate',
    async (request: FastifyRequest<{ Body: z.infer<typeof aggregateSchema> }>, reply: FastifyReply) => {
      const parseResult = aggregateSchema.safeParse(request.body)
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: parseResult.error.errors[0].message
        })
      }
      const { roundId, localModels } = parseResult.data

      const result = federatedLearningService.aggregateModels(roundId, localModels)

      return {
        success: true,
        data: result,
        message: `联邦聚合完成，第 ${roundId} 轮，参与方 ${localModels.length} 个`
      }
    }
  )

  fastify.get('/privacy-budget', async (request: FastifyRequest, reply: FastifyReply) => {
    const budget = federatedLearningService.getPrivacyBudget()
    return {
      success: true,
      data: budget
    }
  })

  fastify.post<{ Body: z.infer<typeof privacyBudgetConsumeSchema> }>(
    '/privacy-budget/consume',
    async (request: FastifyRequest<{ Body: z.infer<typeof privacyBudgetConsumeSchema> }>, reply: FastifyReply) => {
      const parseResult = privacyBudgetConsumeSchema.safeParse(request.body)
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: parseResult.error.errors[0].message
        })
      }
      const { amount } = parseResult.data

      const result = federatedLearningService.consumePrivacyBudget(amount)

      return {
        success: result.success,
        data: result,
        message: result.success
          ? `隐私预算消耗 ${amount}，剩余 ${result.remaining}`
          : '隐私预算不足'
      }
    }
  )

  fastify.get('/audit-log', async (request: FastifyRequest, reply: FastifyReply) => {
    const log = federatedLearningService.getAuditLog()
    return {
      success: true,
      data: log,
      total: log.length
    }
  })

  fastify.post<{ Body: z.infer<typeof dataIntegritySchema> }>(
    '/verify',
    async (request: FastifyRequest<{ Body: z.infer<typeof dataIntegritySchema> }>, reply: FastifyReply) => {
      const parseResult = dataIntegritySchema.safeParse(request.body)
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: parseResult.error.errors[0].message
        })
      }
      const { hospitalId, dataHash } = parseResult.data

      const result = federatedLearningService.verifyDataIntegrity(hospitalId, dataHash)

      return {
        success: result.verified,
        data: result,
        message: result.verified
          ? '数据完整性验证通过'
          : '数据完整性验证失败'
      }
    }
  )

  fastify.get('/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    const metrics = federatedLearningService.getMetrics()
    return {
      success: true,
      data: metrics
    }
  })
}
