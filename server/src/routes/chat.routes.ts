import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { optionalAuth, authenticate } from '../middleware/auth.middleware.js'
import { z } from 'zod'
import { LLMService } from '../services/llm.service.js'
import { RAGService } from '../services/rag.service.js'
import { KnowledgeGraphRAGSync } from '../services/kg-rag-sync.service.js'

const sendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  content: z.string().min(1).max(4000),
  type: z.enum(['CHAT', 'SEARCH', 'REPORT', 'DRUG']).optional(),
  useRAG: z.boolean().optional(),
  useAgent: z.boolean().optional(),
  modelType: z.enum(['auto', 'complex', 'simple']).optional(),
})

const RagCategories: Record<string, string | undefined> = {
  CHAT: undefined,
  SEARCH: undefined,
  REPORT: 'medical_report',
  DRUG: 'drug_info',
}

const ModelTypes: Record<string, 'complex' | 'simple'> = {
  CHAT: 'simple',
  SEARCH: 'simple',
  REPORT: 'complex',
  DRUG: 'simple',
}

const MAX_HISTORY_MESSAGES = 20

const GUEST_SESSION_TIMEOUT = 30 * 60 * 1000

export default async function chatRoutes(fastify: FastifyInstance) {
  const ragService = new RAGService(fastify.prisma, fastify.redisCache)
  const llmService = new LLMService(ragService)
  const kgRagSync = new KnowledgeGraphRAGSync(fastify.prisma, fastify.redisCache)

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
      const { content, conversationId, type = 'CHAT', useRAG = true, useAgent = true, modelType } = body
      const userId = request.user?.userId
      const isGuest = !userId
      
      const userApiKey = request.headers['x-api-key'] as string | undefined
      const userApiBaseUrl = request.headers['x-api-base-url'] as string | undefined
      const userComplexModel = request.headers['x-model-complex'] as string | undefined
      const userSimpleModel = request.headers['x-model-simple'] as string | undefined
      
      const sessionId = request.headers['x-session-id'] as string || 
                        `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

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
          take: MAX_HISTORY_MESSAGES,
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

      if (isGuest) {
        const sessionMessages = await fastify.redisCache.getChatContext(sessionId) || []
        previousMessages = sessionMessages.map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      }

      reply.raw.setHeader('Content-Type', 'text/event-stream')
      reply.raw.setHeader('Cache-Control', 'no-cache')
      reply.raw.setHeader('Connection', 'keep-alive')
      reply.raw.setHeader('X-Accel-Buffering', 'no')
      reply.raw.flushHeaders()

      const messages = [
        ...previousMessages.map(m => ({
          role: m.role.toLowerCase() as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content },
      ]

      let fullResponse = ''
      let sources: Array<{ source: string; content: string }> = []
      let citations: any[] = []
      let deepSearchResult: any = undefined
      let agentUsed: { id: string; name: string; emoji: string } | undefined

      try {
        const resolvedModelType = modelType && modelType !== 'auto' ? modelType : ModelTypes[type]
        const stream = llmService.chatStream({
          messages,
          useRAG,
          useAgent,
          ragCategory: RagCategories[type],
          modelType: resolvedModelType,
          temperature: 0.7,
          userApiKey,
          userApiBaseUrl,
          userComplexModel,
          userSimpleModel,
        })

        for await (const chunk of stream) {
          if (chunk.done) {
            sources = chunk.sources || []
            citations = chunk.citations || []
            deepSearchResult = chunk.deepSearchResult
            agentUsed = chunk.agentUsed
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

        if (isGuest) {
          await fastify.redisCache.appendChatMessage(sessionId, { role: 'user', content })
          await fastify.redisCache.appendChatMessage(sessionId, { role: 'assistant', content: fullResponse })
        }

        reply.raw.write(`data: ${JSON.stringify({ 
          done: true, 
          conversationId: conversation?.id,
          sessionId: isGuest ? sessionId : undefined,
          sources: sources.length > 0 ? sources : undefined,
          citations: citations.length > 0 ? citations : undefined,
          deepSearchResult: deepSearchResult,
          agentUsed: agentUsed,
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
          useAgent: z.boolean().optional(),
        }),
        tags: ['chat'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { content: string; type?: 'CHAT' | 'SEARCH' | 'REPORT' | 'DRUG'; useRAG?: boolean; useAgent?: boolean; modelType?: 'auto' | 'complex' | 'simple' }
      const { content, type = 'CHAT', useRAG = true, useAgent = true, modelType } = body

      const userApiKey = request.headers['x-api-key'] as string | undefined
      const userApiBaseUrl = request.headers['x-api-base-url'] as string | undefined
      const userComplexModel = request.headers['x-model-complex'] as string | undefined
      const userSimpleModel = request.headers['x-model-simple'] as string | undefined

      const resolvedModelType = modelType && modelType !== 'auto' ? modelType : ModelTypes[type]
      const response = await llmService.chat({
        messages: [{ role: 'user', content }],
        useRAG,
        useAgent,
        ragCategory: RagCategories[type],
        modelType: resolvedModelType,
        userApiKey,
        userApiBaseUrl,
        userComplexModel,
        userSimpleModel,
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

  fastify.post(
    '/kg-sync',
    {
      schema: {
        tags: ['chat'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await kgRagSync.syncToRAG()
        return reply.send({
          success: true,
          data: {
            message: `成功同步 ${result.synced} 条知识到RAG系统`,
            ...result,
          },
        })
      } catch (error) {
        fastify.log.error(error, 'KG sync error')
        return reply.status(500).send({
          success: false,
          error: '知识图谱同步失败',
        })
      }
    }
  )

  fastify.get(
    '/kg-status',
    {
      schema: {
        tags: ['chat'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const status = await kgRagSync.getSyncStatus()
        return reply.send({
          success: true,
          data: status,
        })
      } catch (error) {
        fastify.log.error(error, 'KG status error')
        return reply.status(500).send({
          success: false,
          error: '获取知识图谱状态失败',
        })
      }
    }
  )
}
