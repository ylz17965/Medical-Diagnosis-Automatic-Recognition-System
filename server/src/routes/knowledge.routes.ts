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

const batchImportSchema = z.object({
  documents: z.array(z.object({
    title: z.string().min(1).max(200),
    content: z.string().min(1),
    source: z.string().min(1),
    category: z.string().default('general'),
  })).min(1).max(50),
})

const getDocumentsQuerySchema = z.object({
  category: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

const deleteDocumentParamsSchema = z.object({
  id: z.string().min(1),
})

const batchDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
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
        querystring: getDocumentsQuerySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { category, page, limit } = getDocumentsQuerySchema.parse(request.query)

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
        data: {
          documents: documents.map(d => ({
            ...d,
            chunkCount: d._count.chunks,
          })),
          total,
        },
      })
    }
  )

  fastify.delete(
    '/documents/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['knowledge'],
        params: deleteDocumentParamsSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = deleteDocumentParamsSchema.parse(request.params)

      await ragService.deleteDocument(id)

      return reply.send({
        success: true,
        message: '文档已删除',
      })
    }
  )

  fastify.post(
    '/batch-delete',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['knowledge'],
        body: batchDeleteSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { ids } = request.body as z.infer<typeof batchDeleteSchema>

      const count = await ragService.deleteDocuments(ids)

      return reply.send({
        success: true,
        data: { deleted: count },
        message: `成功删除 ${count} 个文档`,
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

      const results = await ragService.searchWithRerank({
        query,
        category,
        topK,
        useHybrid: true,
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
        body: batchImportSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { documents } = request.body as z.infer<typeof batchImportSchema>

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
