import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { AuthService } from '../services/auth.service.js'
import { UserRepository } from '../repositories/user.repository.js'
import { config } from '../config/index.js'

const registerSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号'),
  password: z.string().min(8, '密码至少8位').max(32, '密码最多32位'),
  code: z.string().length(6, '验证码为6位数字'),
  nickname: z.string().min(2).max(20).optional(),
})

const loginSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号'),
  password: z.string().optional(),
  code: z.string().length(6).optional(),
  email: z.string().email().optional(),
})

const sendCodeSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号'),
  type: z.enum(['PHONE', 'EMAIL']).default('PHONE'),
  purpose: z.enum(['REGISTER', 'LOGIN', 'RESET_PASSWORD']),
})

const resetPasswordSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号'),
  code: z.string().length(6, '验证码为6位数字'),
  newPassword: z.string().min(8, '密码至少8位').max(32, '密码最多32位'),
})

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
        maxAge: 7 * 24 * 60 * 60,
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
      } else {
        return reply.status(400).send({
          success: false,
          error: { message: '请提供有效的登录凭证' },
        })
      }
      
      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: config.isProd,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60,
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
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof sendCodeSchema>
      const result = await authService.sendVerificationCode({
        target: body.phone,
        type: body.type,
        purpose: body.purpose,
      })
      return reply.send(result)
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
      const result = await authService.resetPassword(body)
      return reply.send(result)
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
      
      const result = await authService.refreshAccessToken(refreshToken)
      
      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: config.isProd,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })
      
      return reply.send({
        success: true,
        data: {
          accessToken: result.accessToken,
          user: result.user,
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
      const refreshToken = request.cookies.refreshToken
      
      if (refreshToken) {
        try {
          const decoded = require('jsonwebtoken').verify(refreshToken, config.jwt.secret) as { userId: string }
          await authService.logout(decoded.userId, refreshToken)
        } catch {
          // Ignore token verification errors during logout
        }
      }
      
      reply.clearCookie('refreshToken')
      
      return reply.send({
        success: true,
        message: '已登出',
      })
    }
  )
}
