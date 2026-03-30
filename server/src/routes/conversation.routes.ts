import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.middleware.js'
import { ConversationService } from '../services/conversation.service.js'
import { ConversationRepository } from '../repositories/conversation.repository.js'

const createConversationSchema = z.object({
  type: z.enum(['CHAT', 'SEARCH', 'REPORT', 'DRUG']).optional(),
  title: z.string().max(100).optional(),
})

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  type: z.enum(['CHAT', 'SEARCH', 'REPORT', 'DRUG']).optional(),
})

export default async function conversationRoutes(fastify: FastifyInstance) {
  const conversationRepo = new ConversationRepository(fastify.prisma)
  const conversationService = new ConversationService(conversationRepo)

  fastify.get(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        querystring: paginationSchema,
        tags: ['conversation'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as z.infer<typeof paginationSchema>
      const userId = request.user!.userId

      const { conversations, total } = await conversationService.getConversations(
        userId,
        query.page,
        query.limit,
        query.type
      )

      return reply.send({
        success: true,
        data: conversations,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      })
    }
  )

  fastify.get(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        tags: ['conversation'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const userId = request.user!.userId

      const conversation = await conversationService.getConversationById(id, userId)

      return reply.send({
        success: true,
        data: conversation,
      })
    }
  )

  fastify.post(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        body: createConversationSchema,
        tags: ['conversation'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof createConversationSchema>
      const userId = request.user!.userId

      const conversation = await conversationService.createConversation(userId, {
        type: body.type || 'CHAT',
        title: body.title,
      })

      return reply.status(201).send({
        success: true,
        data: conversation,
      })
    }
  )

  fastify.delete(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        tags: ['conversation'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const userId = request.user!.userId

      await conversationService.deleteConversation(id, userId)

      return reply.send({
        success: true,
        message: '对话已删除',
      })
    }
  )

  fastify.put(
    '/:id/title',
    {
      preHandler: [authenticate],
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          title: z.string().min(1).max(100),
        }),
        tags: ['conversation'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const { title } = request.body as { title: string }
      const userId = request.user!.userId

      const conversation = await conversationService.updateTitle(id, userId, title)

      return reply.send({
        success: true,
        data: conversation,
      })
    }
  )

  fastify.get(
    '/:id/messages',
    {
      preHandler: [authenticate],
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(50).default(20),
        }),
        tags: ['conversation'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const { page, limit } = request.query as { page: number; limit: number }
      const userId = request.user!.userId

      const { messages, total } = await conversationService.getMessages(id, userId, page, limit)

      return reply.send({
        success: true,
        data: messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    }
  )

  fastify.delete(
    '/:id/messages',
    {
      preHandler: [authenticate],
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        tags: ['conversation'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const userId = request.user!.userId

      await conversationService.clearMessages(id, userId)

      return reply.send({
        success: true,
        message: '对话消息已清空',
      })
    }
  )
}
