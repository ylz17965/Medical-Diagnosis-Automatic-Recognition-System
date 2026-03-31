import { FastifyInstance } from 'fastify'
import { HybridSearchService } from '../services/hybrid-search.service.js'
import { ExplainableRAGService } from '../services/explainable-rag.service.js'

export default async function explainableRAGRoutes(fastify: FastifyInstance) {
  const hybridSearch = new HybridSearchService(fastify.prisma)
  const explainableRAG = new ExplainableRAGService()

  fastify.addHook('onRequest', async () => {
    await hybridSearch.initialize()
  })

  fastify.post('/explain', async (request, reply) => {
    try {
      const { query, symptoms, response } = request.body as {
        query?: string
        symptoms?: string[]
        response?: string
      }

      if (!query) {
        return reply.status(400).send({ error: '请提供查询内容' })
      }

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
      const { query, response } = request.body as {
        query?: string
        response?: string
      }

      if (!query) {
        return reply.status(400).send({ error: '请提供查询内容' })
      }

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
      const { sources } = request.body as {
        sources?: Array<{
          type: 'vector' | 'knowledge_graph'
          source: string
          content: string
          score: number
        }>
      }

      if (!sources || !Array.isArray(sources)) {
        return reply.status(400).send({ error: '请提供来源列表' })
      }

      const hybridResults = sources.map(s => ({
        type: s.type,
        content: s.content,
        source: s.source,
        score: s.score
      }))

      const explanation = explainableRAG.generateExplanation(
        'confidence_check',
        hybridResults as any
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
      const { query } = request.body as { query?: string }

      if (!query) {
        return reply.status(400).send({ error: '请提供查询内容' })
      }

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
