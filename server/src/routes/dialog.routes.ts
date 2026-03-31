import { FastifyInstance } from 'fastify'
import { DialogStateMachine } from '../services/dialog/index.js'

export default async function dialogRoutes(fastify: FastifyInstance) {
  const dialogMachine = new DialogStateMachine()

  fastify.post('/message', async (request, reply) => {
    try {
      const { sessionId, message } = request.body as {
        sessionId?: string
        message?: string
      }

      if (!message) {
        return reply.status(400).send({ error: '请输入消息内容' })
      }

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
      const { sessionId } = request.params as { sessionId: string }
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
      const { sessionId } = request.params as { sessionId: string }
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
      const { text } = request.body as { text?: string }

      if (!text) {
        return reply.status(400).send({ error: '请提供文本内容' })
      }

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
