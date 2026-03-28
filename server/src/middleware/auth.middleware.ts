import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { UnauthorizedError } from './error-handler.middleware.js'

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string
      email?: string
      phone: string
    }
  }
}

export const authenticate = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const authHeader = request.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('请先登录')
    }

    const token = authHeader.replace('Bearer ', '')
    
    const payload = jwt.verify(token, config.jwt.secret) as {
      userId: string
      email?: string
      phone: string
    }

    request.user = payload
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Token无效或已过期')
    }
    throw error
  }
}

export const optionalAuth = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const authHeader = request.headers.authorization
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const payload = jwt.verify(token, config.jwt.secret) as {
        userId: string
        email?: string
        phone: string
      }
      request.user = payload
    }
  } catch {
    // Optional auth, ignore errors
  }
}
