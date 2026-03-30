import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { UserService } from '../services/user.service.js'
import { UserRepository } from '../repositories/user.repository.js'
import { authenticate } from '../middleware/auth.middleware.js'

const updateProfileSchema = z.object({
  nickname: z.string().min(2, '昵称至少2个字符').max(20, '昵称最多20个字符').optional(),
  email: z.string().email('请输入有效的邮箱地址').optional(),
  avatarUrl: z.string().url('请输入有效的头像URL').optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8, '密码至少8位'),
  newPassword: z.string()
    .min(8, '密码至少8位')
    .max(32, '密码最多32位')
    .regex(/[A-Z]/, '密码需包含大写字母')
    .regex(/[a-z]/, '密码需包含小写字母')
    .regex(/[0-9]/, '密码需包含数字'),
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

  fastify.get(
    '/me/stats',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['user'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.userId
      
      const [conversationCount, messageCount] = await Promise.all([
        fastify.prisma.conversation.count({ where: { userId } }),
        fastify.prisma.message.count({
          where: {
            conversation: { userId },
          },
        }),
      ])

      return reply.send({
        success: true,
        data: {
          conversationCount,
          messageCount,
          memberSince: request.user?.userId ? 
            (await userRepo.findById(request.user.userId))?.createdAt : null,
        },
      })
    }
  )

  fastify.post(
    '/me/avatar',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['user'],
        consumes: ['multipart/form-data'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await request.file()
      
      if (!data) {
        return reply.status(400).send({
          success: false,
          error: { message: '请上传头像文件' },
        })
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({
          success: false,
          error: { message: '只支持 JPG、PNG、GIF、WebP 格式的图片' },
        })
      }

      const maxSize = 2 * 1024 * 1024 // 2MB
      const buffer = await data.toBuffer()
      if (buffer.length > maxSize) {
        return reply.status(400).send({
          success: false,
          error: { message: '头像文件大小不能超过 2MB' },
        })
      }

      const avatarUrl = await userService.uploadAvatar(request.user!.userId, buffer, data.mimetype)
      
      return reply.send({
        success: true,
        data: { avatarUrl },
      })
    }
  )
}
