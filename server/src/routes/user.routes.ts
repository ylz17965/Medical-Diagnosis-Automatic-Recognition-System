import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { UserService } from '../services/user.service.js'
import { UserRepository } from '../repositories/user.repository.js'
import { authenticate } from '../middleware/auth.middleware.js'

const updateProfileSchema = z.object({
  nickname: z.string().min(2).max(20).optional(),
  email: z.string().email().optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).regex(/[A-Z]/, '密码需包含大写字母').regex(/[a-z]/, '密码需包含小写字母').regex(/[0-9]/, '密码需包含数字'),
})

export default async function userRoutes(fastify: FastifyInstance) {
  const userRepo = new UserRepository(fastify.prisma)
  const userService = new UserService(userRepo)

  fastify.get(
    '/me',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['user'],
        response: {
          200: {
            description: '获取当前用户信息',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  phone: { type: 'string' },
                  email: { type: 'string', nullable: true },
                  nickname: { type: 'string' },
                  avatarUrl: { type: 'string', nullable: true },
                  status: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await userService.getUserById(request.user!.userId)
      return reply.send({ success: true, data: user })
    }
  )

  fastify.put(
    '/me',
    {
      preHandler: [authenticate],
      schema: {
        body: updateProfileSchema,
        tags: ['user'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof updateProfileSchema>
      const user = await userService.updateProfile(request.user!.userId, body)
      return reply.send({ success: true, data: user })
    }
  )

  fastify.put(
    '/me/password',
    {
      preHandler: [authenticate],
      schema: {
        body: changePasswordSchema,
        tags: ['user'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof changePasswordSchema>
      await userService.changePassword(
        request.user!.userId,
        body.currentPassword,
        body.newPassword
      )
      return reply.send({ success: true, message: '密码修改成功' })
    }
  )

  fastify.delete(
    '/me',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['user'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await userService.deleteAccount(request.user!.userId)
      reply.clearCookie('refreshToken')
      return reply.send({ success: true, message: '账号已注销' })
    }
  )
}
