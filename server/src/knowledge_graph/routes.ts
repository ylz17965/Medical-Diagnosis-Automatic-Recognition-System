import { FastifyInstance } from 'fastify'
import { knowledgeGraph } from './index.js'

export default async function knowledgeGraphRoutes(fastify: FastifyInstance) {
  fastify.get('/search', async (request, reply) => {
    try {
      await knowledgeGraph.load()
      const { q, limit = '10' } = request.query as { q?: string; limit?: string }

      if (!q) {
        return reply.status(400).send({ error: '搜索关键词不能为空' })
      }

      const results = knowledgeGraph.search(q, parseInt(limit, 10))
      return {
        success: true,
        data: results.map(node => ({
          id: node.id,
          type: node.type,
          name: (node.data as { name: string }).name,
          data: node.data
        }))
      }
    } catch (error) {
      fastify.log.error(error, '知识图谱搜索失败')
      return reply.status(500).send({ error: '搜索失败' })
    }
  })

  fastify.get('/node/:id', async (request, reply) => {
    try {
      await knowledgeGraph.load()
      const { id } = request.params as { id: string }
      const node = knowledgeGraph.getNode(id)

      if (!node) {
        return reply.status(404).send({ error: '节点不存在' })
      }

      const relations = knowledgeGraph.getRelations(id)
      const relatedNodes = knowledgeGraph.getRelatedNodes(id)

      return {
        success: true,
        data: {
          node,
          relations,
          relatedNodes: relatedNodes.map(n => ({
            id: n.id,
            type: n.type,
            name: (n.data as { name: string }).name
          }))
        }
      }
    } catch (error) {
      fastify.log.error(error, '获取节点失败')
      return reply.status(500).send({ error: '获取节点失败' })
    }
  })

  fastify.get('/disease/:id', async (request, reply) => {
    try {
      await knowledgeGraph.load()
      const { id } = request.params as { id: string }
      const node = knowledgeGraph.getNode(id)

      if (!node || node.type !== 'Disease') {
        return reply.status(404).send({ error: '疾病不存在' })
      }

      const disease = node.data
      const symptoms = knowledgeGraph.getDiseaseSymptoms(id)
      const drugs = knowledgeGraph.getDiseaseDrugs(id)
      const examinations = knowledgeGraph.getDiseaseExaminations(id)

      return {
        success: true,
        data: {
          disease,
          symptoms,
          drugs,
          examinations
        }
      }
    } catch (error) {
      fastify.log.error(error, '获取疾病信息失败')
      return reply.status(500).send({ error: '获取疾病信息失败' })
    }
  })

  fastify.get('/drug/:id', async (request, reply) => {
    try {
      await knowledgeGraph.load()
      const { id } = request.params as { id: string }
      const node = knowledgeGraph.getNode(id)

      if (!node || node.type !== 'Drug') {
        return reply.status(404).send({ error: '药品不存在' })
      }

      const drug = node.data
      const sideEffects = knowledgeGraph.getDrugSideEffects(id)

      return {
        success: true,
        data: {
          drug,
          sideEffects
        }
      }
    } catch (error) {
      fastify.log.error(error, '获取药品信息失败')
      return reply.status(500).send({ error: '获取药品信息失败' })
    }
  })

  fastify.get('/symptom/:id', async (request, reply) => {
    try {
      await knowledgeGraph.load()
      const { id } = request.params as { id: string }
      const node = knowledgeGraph.getNode(id)

      if (!node || node.type !== 'Symptom') {
        return reply.status(404).send({ error: '症状不存在' })
      }

      const symptom = node.data
      const diseases = knowledgeGraph.getSymptomDiseases(id)

      return {
        success: true,
        data: {
          symptom,
          diseases
        }
      }
    } catch (error) {
      fastify.log.error(error, '获取症状信息失败')
      return reply.status(500).send({ error: '获取症状信息失败' })
    }
  })

  fastify.post('/diagnose', async (request, reply) => {
    try {
      await knowledgeGraph.load()
      const { symptoms } = request.body as { symptoms?: string[] }

      if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
        return reply.status(400).send({ error: '请提供症状列表' })
      }

      const symptomIds: string[] = []
      symptoms.forEach(s => {
        const nodes = knowledgeGraph.getNodeByName(s)
        nodes.forEach(n => {
          if (n.type === 'Symptom' && !symptomIds.includes(n.id)) {
            symptomIds.push(n.id)
          }
        })
      })

      if (symptomIds.length === 0) {
        return {
          success: true,
          data: [],
          message: '未找到匹配的症状'
        }
      }

      const results = knowledgeGraph.diagnoseBySymptoms(symptomIds)

      return {
        success: true,
        data: results.slice(0, 10),
        matchedSymptoms: symptomIds.length
      }
    } catch (error) {
      fastify.log.error(error, '诊断失败')
      return reply.status(500).send({ error: '诊断失败' })
    }
  })

  fastify.get('/stats', async () => {
    await knowledgeGraph.load()
    const stats = knowledgeGraph.getStats()
    return {
      success: true,
      data: stats
    }
  })

  fastify.get('/path', async (request, reply) => {
    try {
      await knowledgeGraph.load()
      const { start, end, maxDepth = '3' } = request.query as {
        start?: string
        end?: string
        maxDepth?: string
      }

      if (!start || !end) {
        return reply.status(400).send({ error: '请提供起点和终点节点ID' })
      }

      const paths = knowledgeGraph.findPath(start, end, parseInt(maxDepth, 10))

      return {
        success: true,
        data: paths.slice(0, 5).map(path =>
          path.map(node => ({
            id: node.id,
            type: node.type,
            name: (node.data as { name: string }).name
          }))
        )
      }
    } catch (error) {
      fastify.log.error(error, '查找路径失败')
      return reply.status(500).send({ error: '查找路径失败' })
    }
  })
}
