import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { authenticate } from '../middleware/auth.middleware.js'

export default async function conversationRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['chat'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number }
      const userId = request.user!.userId

      const conversations = await fastify.prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })

      const total = await fastify.prisma.conversation.count({
        where: { userId },
      })

      return reply.send({
        success: true,
        data: conversations,
        meta: { page, limit, total },
      })
    }
  )

  fastify.post(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['chat'],
        body: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['CHAT', 'SEARCH', 'REPORT', 'DRUG'] },
            title: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { type = 'CHAT', title } = request.body as { type?: string; title?: string }
      const userId = request.user!.userId

      const conversation = await fastify.prisma.conversation.create({
        data: {
          userId,
          type: type as any,
          title: title || '新对话',
        },
      })

      return reply.status(201).send({
        success: true,
        data: conversation,
      })
    }
  )

  fastify.get(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['chat'],
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
      const userId = request.user!.userId

      const conversation = await fastify.prisma.conversation.findFirst({
        where: { id, userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      if (!conversation) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: '会话不存在' },
        })
      }

      return reply.send({
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
        tags: ['chat'],
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
      const userId = request.user!.userId

      const conversation = await fastify.prisma.conversation.findFirst({
        where: { id, userId },
      })

      if (!conversation) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: '会话不存在' },
        })
      }

      await fastify.prisma.conversation.delete({
        where: { id },
      })

      return reply.send({
        success: true,
        message: '会话已删除',
      })
    }
  )
}
