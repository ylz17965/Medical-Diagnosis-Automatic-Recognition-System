import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { AuthService } from '../services/auth.service.js'
import { UserRepository } from '../repositories/user.repository.js'
import { registerSchema, loginSchema, sendCodeSchema, resetPasswordSchema } from '../types/auth.types.js'
import { config } from '../config/index.js'

export default async function authRoutes(fastify: FastifyInstance) {
  const userRepo = new UserRepository(fastify.prisma)
  const authService = new AuthService(userRepo, fastify)

  fastify.post(
    '/register',
    {
      schema: {
        body: registerSchema,
        tags: ['auth'],
        response: {
          201: {
            description: '注册成功',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: { type: 'object' },
                  accessToken: { type: 'string' },
                },
              },
            },
          },
          400: {
            description: '请求参数错误',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'object' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof registerSchema>
      const result = await authService.register(body)
      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: config.isProd,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      })
      return reply.status(201).send({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      })
    }
  )

  fastify.post(
    '/login',
    {
      schema: {
        body: loginSchema,
        tags: ['auth'],
        response: {
          200: {
            description: '登录成功',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: { type: 'object' },
                  accessToken: { type: 'string' },
                },
              },
            },
          },
          401: {
            description: '认证失败',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'object' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof loginSchema>
      
      let result
      if (body.phone && body.code) {
        result = await authService.loginWithCode({ phone: body.phone, code: body.code })
      } else if (body.phone && body.password) {
        result = await authService.login({ phone: body.phone, password: body.password })
      } else if (body.email && body.password) {
        throw new Error('邮箱登录暂未实现')
      } else {
        throw new Error('请提供有效的登录凭证')
      }
      
      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: config.isProd,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      })
      return reply.send({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      })
    }
  )

  fastify.post(
    '/send-code',
    {
      schema: {
        body: sendCodeSchema,
        tags: ['auth'],
        response: {
          200: {
            description: '验证码发送成功',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          429: {
            description: '请求过于频繁',
            type: 'object',
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof sendCodeSchema>
      return reply.send({
        success: true,
        message: '验证码已发送',
      })
    }
  )

  fastify.post(
    '/reset-password',
    {
      schema: {
        body: resetPasswordSchema,
        tags: ['auth'],
        response: {
          200: {
            description: '密码重置成功',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof resetPasswordSchema>
      return reply.send({
        success: true,
        message: '密码已重置',
      })
    }
  )

  fastify.post(
    '/refresh',
    {
      schema: {
        tags: ['auth'],
        response: {
          200: {
            description: 'Token刷新成功',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  user: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const refreshToken = request.cookies.refreshToken
      if (!refreshToken) {
        return reply.status(401).send({
          success: false,
          error: { message: '未提供刷新令牌' },
        })
      }
      return reply.send({
        success: true,
        data: {
          accessToken: 'new-access-token',
          user: {},
        },
      })
    }
  )

  fastify.post(
    '/logout',
    {
      schema: {
        tags: ['auth'],
        response: {
          200: {
            description: '登出成功',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      reply.clearCookie('refreshToken')
      return reply.send({
        success: true,
        message: '已登出',
      })
    }
  )
}
