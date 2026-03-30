import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { optionalAuth, authenticate } from '../middleware/auth.middleware.js'
import { z } from 'zod'
import { LLMService } from '../services/llm.service.js'
import { RAGService } from '../services/rag.service.js'

const sendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  content: z.string().min(1).max(4000),
  type: z.enum(['CHAT', 'SEARCH', 'REPORT', 'DRUG']).optional(),
  useRAG: z.boolean().optional(),
})

const RagCategories: Record<string, string> = {
  CHAT: 'general',
  SEARCH: 'general',
  REPORT: 'medical_report',
  DRUG: 'drug_info',
}

const ModelTypes: Record<string, 'complex' | 'simple'> = {
  CHAT: 'simple',
  SEARCH: 'complex',
  REPORT: 'complex',
  DRUG: 'complex',
}

export default async function chatRoutes(fastify: FastifyInstance) {
  const ragService = new RAGService(fastify.prisma)
  const llmService = new LLMService(ragService)

  fastify.get(
    '/health',
    {
      schema: {
        tags: ['chat'],
      },
    },
    async () => {
      const llmHealth = await llmService.checkHealth()
      const ragStats = await ragService.getDocumentStats()
      
      return {
        llm: llmHealth ? 'healthy' : 'unhealthy',
        rag: {
          documents: ragStats.totalDocuments,
          chunks: ragStats.totalChunks,
          categories: ragStats.categories,
        },
      }
    }
  )

  fastify.post(
    '/stream',
    {
      preHandler: [optionalAuth],
      schema: {
        body: sendMessageSchema,
        tags: ['chat'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof sendMessageSchema>
      const { content, conversationId, type = 'CHAT', useRAG = true } = body
      const userId = request.user?.userId
      const isGuest = !userId

      let conversation = null
      let previousMessages: Array<{ role: string; content: string }> = []

      if (!isGuest && conversationId) {
        conversation = await fastify.prisma.conversation.findFirst({
          where: { id: conversationId, userId },
        })
      }

      if (!isGuest && !conversation) {
        conversation = await fastify.prisma.conversation.create({
          data: {
            userId: userId!,
            type: type as any,
            title: content.slice(0, 30),
          },
        })
      }

      if (!isGuest && conversation) {
        const messages = await fastify.prisma.message.findMany({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: 'asc' },
          take: 10,
        })

        previousMessages = messages.map(m => ({
          role: m.role.toLowerCase() as 'user' | 'assistant',
          content: m.content,
        }))

        await fastify.prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'USER',
            content,
          },
        })
      }

      reply.raw.setHeader('Content-Type', 'text/event-stream')
      reply.raw.setHeader('Cache-Control', 'no-cache')
      reply.raw.setHeader('Connection', 'keep-alive')
      reply.raw.setHeader('X-Accel-Buffering', 'no')

      const messages = [
        ...previousMessages.map(m => ({
          role: m.role.toLowerCase() as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content },
      ]

      let fullResponse = ''
      let sources: Array<{ source: string; content: string }> = []

      try {
        const stream = llmService.chatStream({
          messages,
          useRAG,
          ragCategory: RagCategories[type],
          modelType: ModelTypes[type],
          temperature: 0.7,
        })

        for await (const chunk of stream) {
          if (chunk.done) {
            sources = chunk.sources || []
          } else {
            fullResponse += chunk.content
            reply.raw.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`)
          }
        }

        if (!isGuest && conversation) {
          await fastify.prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: 'ASSISTANT',
              content: fullResponse,
              sources: sources.length > 0 ? JSON.stringify(sources) : undefined,
            },
          })
          
          await fastify.prisma.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
          })
        }

        reply.raw.write(`data: ${JSON.stringify({ 
          done: true, 
          conversationId: conversation?.id,
          sources: sources.length > 0 ? sources : undefined,
        })}\n\n`)
      } catch (error) {
        console.error('Chat stream error:', error)
        reply.raw.write(`data: ${JSON.stringify({ 
          error: '抱歉，生成回复时出现错误，请稍后重试。',
          done: true,
        })}\n\n`)
      }

      reply.raw.end()
    }
  )

  fastify.post(
    '/complete',
    {
      preHandler: [optionalAuth],
      schema: {
        body: z.object({
          content: z.string().min(1).max(4000),
          type: z.enum(['CHAT', 'SEARCH', 'REPORT', 'DRUG']).optional(),
          useRAG: z.boolean().optional(),
        }),
        tags: ['chat'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { content: string; type?: 'CHAT' | 'SEARCH' | 'REPORT' | 'DRUG'; useRAG?: boolean }
      const { content, type = 'CHAT', useRAG = true } = body

      const response = await llmService.chat({
        messages: [{ role: 'user', content }],
        useRAG,
        ragCategory: RagCategories[type],
        modelType: ModelTypes[type],
      })

      return reply.send({
        success: true,
        data: { content: response },
      })
    }
  )
  
  fastify.get(
    '/models',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['chat'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const models = await llmService.listModels()
      return reply.send({
        success: true,
        data: {
          provider: llmService.getProvider(),
          models,
        },
      })
    }
  )
}
