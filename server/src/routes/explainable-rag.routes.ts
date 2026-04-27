import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { HybridSearchService, type HybridSearchResult } from '../services/hybrid-search.service.js'
import { ExplainableRAGService } from '../services/explainable-rag.service.js'

interface SourceReference {
  type: 'vector' | 'knowledge_graph'
  source: string
  content: string
  score: number
}

const explainQuerySchema = z.object({
  query: z.string().min(1, '查询内容不能为空').max(2000),
  symptoms: z.array(z.string()).optional(),
  response: z.string().optional(),
})

const confidenceSchema = z.object({
  sources: z.array(z.object({
    type: z.enum(['vector', 'knowledge_graph']),
    source: z.string(),
    content: z.string(),
    score: z.number().min(0).max(1),
  })).min(1, '至少需要一个来源'),
})

const reasoningChainSchema = z.object({
  query: z.string().min(1, '查询内容不能为空').max(2000),
})

export default async function explainableRAGRoutes(fastify: FastifyInstance) {
  const hybridSearch = new HybridSearchService(fastify.prisma, fastify.redisCache)
  const explainableRAG = new ExplainableRAGService()

  fastify.addHook('onRequest', async () => {
    await hybridSearch.initialize()
  })

  fastify.post('/explain', async (request, reply) => {
    try {
      const parseResult = explainQuerySchema.safeParse(request.body)
      if (!parseResult.success) {
        return reply.status(400).send({ error: parseResult.error.errors[0].message })
      }
      const { query, symptoms, response } = parseResult.data

      const searchResults = await hybridSearch.search({
        query,
        topK: 8
      })

      const explanation = explainableRAG.generateExplanation(
        query,
        searchResults,
        response
      )

      return {
        success: true,
        data: explanation
      }
    } catch (error) {
      fastify.log.error(error, '生成解释失败')
      return reply.status(500).send({ error: '生成解释失败' })
    }
  })

  fastify.post('/explain/formatted', async (request, reply) => {
    try {
      const parseResult = explainQuerySchema.omit({ symptoms: true }).safeParse(request.body)
      if (!parseResult.success) {
        return reply.status(400).send({ error: parseResult.error.errors[0].message })
      }
      const { query, response } = parseResult.data

      const searchResults = await hybridSearch.search({
        query,
        topK: 8
      })

      const explanation = explainableRAG.generateExplanation(
        query,
        searchResults,
        response
      )

      const formatted = explainableRAG.formatExplanationForDisplay(explanation)

      return {
        success: true,
        data: {
          explanation,
          formatted
        }
      }
    } catch (error) {
      fastify.log.error(error, '生成格式化解释失败')
      return reply.status(500).send({ error: '生成格式化解释失败' })
    }
  })

  fastify.post('/confidence', async (request, reply) => {
    try {
      const parseResult = confidenceSchema.safeParse(request.body)
      if (!parseResult.success) {
        return reply.status(400).send({ error: parseResult.error.errors[0].message })
      }
      const { sources } = parseResult.data

      const hybridResults: SourceReference[] = sources.map(s => ({
        type: s.type,
        content: s.content,
        source: s.source,
        score: s.score
      }))

      const explanation = explainableRAG.generateExplanation(
        'confidence_check',
        hybridResults as unknown as HybridSearchResult[]
      )

      return {
        success: true,
        data: {
          overallConfidence: explanation.overallConfidence,
          sourceConfidences: explanation.sources.map(s => ({
            source: s.source,
            confidence: s.confidence
          }))
        }
      }
    } catch (error) {
      fastify.log.error(error, '计算置信度失败')
      return reply.status(500).send({ error: '计算置信度失败' })
    }
  })

  fastify.post('/reasoning-chain', async (request, reply) => {
    try {
      const parseResult = reasoningChainSchema.safeParse(request.body)
      if (!parseResult.success) {
        return reply.status(400).send({ error: parseResult.error.errors[0].message })
      }
      const { query } = parseResult.data

      const searchResults = await hybridSearch.search({
        query,
        topK: 5
      })

      const explanation = explainableRAG.generateExplanation(query, searchResults)

      return {
        success: true,
        data: {
          query: explanation.query,
          reasoningChain: explanation.reasoningChain,
          overallConfidence: explanation.overallConfidence
        }
      }
    } catch (error) {
      fastify.log.error(error, '生成推理链失败')
      return reply.status(500).send({ error: '生成推理链失败' })
    }
  })

  fastify.get('/source-reliability', async () => {
    const reliabilityMap = {
      '知识图谱: Disease': 0.95,
      '知识图谱: Drug': 0.95,
      '知识图谱: Symptom': 0.90,
      '知识图谱: Examination': 0.90,
      '知识图谱: Department': 0.85,
      '医学教材': 0.90,
      '临床指南': 0.95,
      '医学论文': 0.80,
      '健康网站': 0.70,
      'general': 0.60
    }

    return {
      success: true,
      data: reliabilityMap
    }
  })
}
