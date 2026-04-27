import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.middleware.js'
import { RAGService } from '../services/rag.service.js'

const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  source: z.string().min(1),
  category: z.string().default('general'),
  metadata: z.record(z.any()).optional(),
})

const searchSchema = z.object({
  query: z.string().min(1),
  category: z.string().optional(),
  topK: z.number().min(1).max(20).optional(),
})

export default async function knowledgeRoutes(fastify: FastifyInstance) {
  const ragService = new RAGService(fastify.prisma, fastify.redisCache)

  fastify.get(
    '/stats',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['knowledge'],
      },
    },
    async () => {
      return ragService.getDocumentStats()
    }
  )

  fastify.post(
    '/documents',
    {
      preHandler: [authenticate],
      schema: {
        body: createDocumentSchema,
        tags: ['knowledge'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof createDocumentSchema>
      const { title, content, source, category, metadata } = body

      const documentId = await ragService.indexDocument({
        title,
        content,
        source,
        category,
        metadata,
      })

      return reply.status(201).send({
        success: true,
        data: { id: documentId },
      })
    }
  )

  fastify.get(
    '/documents',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['knowledge'],
        querystring: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { category, page = 1, limit = 20 } = request.query as {
        category?: string
        page?: number
        limit?: number
      }

      const where = category ? { category } : {}

      const [documents, total] = await Promise.all([
        fastify.prisma.knowledgeDocument.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            _count: {
              select: { chunks: true },
            },
          },
        }),
        fastify.prisma.knowledgeDocument.count({ where }),
      ])

      return reply.send({
        success: true,
        data: documents.map(d => ({
          ...d,
          chunkCount: d._count.chunks,
        })),
        meta: { page, limit, total },
      })
    }
  )

  fastify.delete(
    '/documents/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['knowledge'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }

      await ragService.deleteDocument(id)

      return reply.send({
        success: true,
        message: '文档已删除',
      })
    }
  )

  fastify.post(
    '/search',
    {
      preHandler: [authenticate],
      schema: {
        body: searchSchema,
        tags: ['knowledge'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof searchSchema>
      const { query, category, topK } = body

      const results = await ragService.searchSimilar({
        query,
        category,
        topK,
      })

      return reply.send({
        success: true,
        data: results,
      })
    }
  )

  fastify.post(
    '/batch',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['knowledge'],
        body: {
          type: 'object',
          properties: {
            documents: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  content: { type: 'string' },
                  source: { type: 'string' },
                  category: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { documents } = request.body as {
        documents: Array<{
          title: string
          content: string
          source: string
          category?: string
        }>
      }

      const results = []
      for (const doc of documents) {
        const id = await ragService.indexDocument({
          title: doc.title,
          content: doc.content,
          source: doc.source,
          category: doc.category || 'general',
        })
        results.push({ title: doc.title, id })
      }

      return reply.status(201).send({
        success: true,
        data: { indexed: results.length, documents: results },
      })
    }
  )
}
