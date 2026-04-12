import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { routeToAgent, getAgentSystemPrompt, listAgents } from '../services/agent.service.js'

const messageSchema = z.object({
  message: z.string().min(1, '消息内容不能为空').max(5000),
})

const agentIdSchema = z.object({
  agentId: z.string().min(1, 'Agent ID不能为空'),
})

export default async function agentRoutes(fastify: FastifyInstance) {
  fastify.get('/list', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const agents = listAgents()
      return reply.send({
        success: true,
        data: agents
      })
    } catch (error) {
      const err = error as Error
      return reply.code(500).send({
        success: false,
        error: err.message
      })
    }
  })

  fastify.post('/route', async (request, reply) => {
    try {
      const parseResult = messageSchema.safeParse(request.body)
      if (!parseResult.success) {
        return reply.code(400).send({
          success: false,
          error: parseResult.error.errors[0].message
        })
      }
      const { message } = parseResult.data
      
      const result = routeToAgent(message)
      
      return reply.send({
        success: true,
        data: result
      })
    } catch (error) {
      const err = error as Error
      return reply.code(500).send({
        success: false,
        error: err.message
      })
    }
  })

  fastify.get('/:agentId/prompt', async (request, reply) => {
    try {
      const parseResult = agentIdSchema.safeParse(request.params)
      if (!parseResult.success) {
        return reply.code(400).send({
          success: false,
          error: parseResult.error.errors[0].message
        })
      }
      const { agentId } = parseResult.data
      
      const prompt = getAgentSystemPrompt(agentId)
      
      return reply.send({
        success: true,
        data: { prompt }
      })
    } catch (error) {
      const err = error as Error
      return reply.code(500).send({
        success: false,
        error: err.message
      })
    }
  })
}
