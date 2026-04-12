import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { DialogStateMachine } from '../services/dialog/index.js'

const messageSchema = z.object({
  sessionId: z.string().optional(),
  message: z.string().min(1, '消息内容不能为空').max(2000),
})

const textSchema = z.object({
  text: z.string().min(1, '文本内容不能为空').max(5000),
})

const sessionIdSchema = z.object({
  sessionId: z.string().uuid('无效的会话ID'),
})

export default async function dialogRoutes(fastify: FastifyInstance) {
  const dialogMachine = new DialogStateMachine()

  fastify.post('/message', async (request, reply) => {
    try {
      const parseResult = messageSchema.safeParse(request.body)
      if (!parseResult.success) {
        return reply.status(400).send({ error: parseResult.error.errors[0].message })
      }
      const { sessionId, message } = parseResult.data

      const sid = sessionId || crypto.randomUUID()

      const { context, action } = dialogMachine.processInput(sid, message)

      return {
        success: true,
        data: {
          sessionId: sid,
          state: context.currentState,
          intent: context.intent,
          response: action.response,
          slots: Object.fromEntries(
            Array.from(context.slots.entries()).map(([k, v]) => [k, v.value])
          ),
          action: action.type,
          data: action.data
        }
      }
    } catch (error) {
      fastify.log.error(error, '处理对话失败')
      return reply.status(500).send({ error: '处理对话失败' })
    }
  })

  fastify.get('/context/:sessionId', async (request, reply) => {
    try {
      const parseResult = sessionIdSchema.safeParse(request.params)
      if (!parseResult.success) {
        return reply.status(400).send({ error: parseResult.error.errors[0].message })
      }
      const { sessionId } = parseResult.data
      const context = dialogMachine.getContext(sessionId)

      if (!context) {
        return reply.status(404).send({ error: '会话不存在' })
      }

      return {
        success: true,
        data: {
          sessionId: context.sessionId,
          state: context.currentState,
          intent: context.intent,
          slots: Object.fromEntries(
            Array.from(context.slots.entries()).map(([k, v]) => [k, v.value])
          ),
          history: context.history.slice(-10),
          createdAt: context.createdAt,
          updatedAt: context.updatedAt
        }
      }
    } catch (error) {
      fastify.log.error(error, '获取会话上下文失败')
      return reply.status(500).send({ error: '获取会话上下文失败' })
    }
  })

  fastify.delete('/session/:sessionId', async (request, reply) => {
    try {
      const parseResult = sessionIdSchema.safeParse(request.params)
      if (!parseResult.success) {
        return reply.status(400).send({ error: parseResult.error.errors[0].message })
      }
      const { sessionId } = parseResult.data
      dialogMachine.resetSession(sessionId)

      return {
        success: true,
        message: '会话已重置'
      }
    } catch (error) {
      fastify.log.error(error, '重置会话失败')
      return reply.status(500).send({ error: '重置会话失败' })
    }
  })

  fastify.get('/stats', async () => {
    const stats = dialogMachine.getSessionStats()
    return {
      success: true,
      data: stats
    }
  })

  fastify.post('/intent/recognize', async (request, reply) => {
    try {
      const parseResult = textSchema.safeParse(request.body)
      if (!parseResult.success) {
        return reply.status(400).send({ error: parseResult.error.errors[0].message })
      }
      const { text } = parseResult.data

      const { IntentRecognizer } = await import('../services/dialog/intent-recognizer.js')
      const recognizer = new IntentRecognizer()
      const result = recognizer.recognizeIntent(text)

      return {
        success: true,
        data: {
          intent: result.intent,
          confidence: result.confidence,
          entities: result.entities,
          intentDescription: recognizer.getIntentDescription(result.intent)
        }
      }
    } catch (error) {
      fastify.log.error(error, '意图识别失败')
      return reply.status(500).send({ error: '意图识别失败' })
    }
  })
}
