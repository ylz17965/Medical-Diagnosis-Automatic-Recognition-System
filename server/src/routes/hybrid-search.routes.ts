import { FastifyInstance } from 'fastify'
import { HybridSearchService } from '../services/hybrid-search.service.js'

export default async function hybridSearchRoutes(fastify: FastifyInstance) {
  const hybridSearch = new HybridSearchService(fastify.prisma)

  fastify.addHook('onRequest', async () => {
    await hybridSearch.initialize()
  })

  fastify.get('/search', async (request, reply) => {
    try {
      const { q, category, limit = '10' } = request.query as {
        q?: string
        category?: string
        limit?: string
      }

      if (!q) {
        return reply.status(400).send({ error: '搜索关键词不能为空' })
      }

      const results = await hybridSearch.search({
        query: q,
        category,
        topK: parseInt(limit, 10)
      })

      return {
        success: true,
        data: results
      }
    } catch (error) {
      fastify.log.error(error, '混合检索失败')
      return reply.status(500).send({ error: '检索失败' })
    }
  })

  fastify.post('/diagnose', async (request, reply) => {
    try {
      const { symptoms } = request.body as { symptoms?: string[] }

      if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
        return reply.status(400).send({ error: '请提供症状列表' })
      }

      const results = await hybridSearch.diagnoseBySymptoms(symptoms)

      return {
        success: true,
        data: results
      }
    } catch (error) {
      fastify.log.error(error, '诊断失败')
      return reply.status(500).send({ error: '诊断失败' })
    }
  })

  fastify.get('/drug/:name', async (request, reply) => {
    try {
      const { name } = request.params as { name: string }
      const result = await hybridSearch.getDrugInfo(decodeURIComponent(name))

      if (!result.drug) {
        return reply.status(404).send({ error: '药品不存在' })
      }

      return {
        success: true,
        data: result
      }
    } catch (error) {
      fastify.log.error(error, '获取药品信息失败')
      return reply.status(500).send({ error: '获取药品信息失败' })
    }
  })

  fastify.get('/disease/:name', async (request, reply) => {
    try {
      const { name } = request.params as { name: string }
      const result = await hybridSearch.getDiseaseInfo(decodeURIComponent(name))

      if (!result.disease) {
        return reply.status(404).send({ error: '疾病不存在' })
      }

      return {
        success: true,
        data: result
      }
    } catch (error) {
      fastify.log.error(error, '获取疾病信息失败')
      return reply.status(500).send({ error: '获取疾病信息失败' })
    }
  })

  fastify.post('/context', async (request, reply) => {
    try {
      const { query, symptoms, maxTokens } = request.body as {
        query?: string
        symptoms?: string[]
        maxTokens?: number
      }

      if (!query) {
        return reply.status(400).send({ error: '请提供查询内容' })
      }

      const context = await hybridSearch.buildEnhancedContext({
        query,
        symptoms: symptoms || [],
        maxTokens: maxTokens || 2000
      })

      return {
        success: true,
        data: { context }
      }
    } catch (error) {
      fastify.log.error(error, '构建上下文失败')
      return reply.status(500).send({ error: '构建上下文失败' })
    }
  })

  fastify.get('/stats', async () => {
    const stats = hybridSearch.getStats()
    return {
      success: true,
      data: stats
    }
  })

  fastify.put('/weights', async (request, reply) => {
    try {
      const { vectorWeight, kgWeight } = request.body as {
        vectorWeight?: number
        kgWeight?: number
      }

      if (vectorWeight !== undefined && kgWeight !== undefined) {
        if (vectorWeight + kgWeight !== 1) {
          return reply.status(400).send({ error: '权重之和必须为1' })
        }
        hybridSearch.setWeights(vectorWeight, kgWeight)
      }

      return {
        success: true,
        data: hybridSearch.getStats()
      }
    } catch (error) {
      fastify.log.error(error, '设置权重失败')
      return reply.status(500).send({ error: '设置权重失败' })
    }
  })
}
