import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import { config } from './config/index.js'
import { errorHandler } from './middleware/error-handler.middleware.js'
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
import conversationRoutes from './routes/conversation.routes.js'
import chatRoutes from './routes/chat.routes.js'
import uploadRoutes from './routes/upload.routes.js'
import knowledgeRoutes from './routes/knowledge.routes.js'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
    redis: Redis | null
  }
}

const fastify = Fastify({
  logger: {
    level: config.logLevel,
    transport: config.isDev
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
})

fastify.setValidatorCompiler(validatorCompiler)
fastify.setSerializerCompiler(serializerCompiler)

await fastify.register(helmet, {
  contentSecurityPolicy: config.isProd
    ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", config.corsOrigin, config.llm.ollama.baseUrl],
      },
    }
    : false,
})

await fastify.register(cors, {
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
})

await fastify.register(cookie, {
  secret: config.cookieSecret,
  hook: 'onRequest',
})

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes',
  cache: 10000,
  allowList: ['127.0.0.1'],
})

await fastify.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: '智疗助手 API',
      description: 'AI健康咨询平台后端API - 支持RAG知识库检索',
      version: '1.0.0',
    },
    servers: [
      { url: 'http://localhost:3001', description: '开发服务器' },
    ],
    tags: [
      { name: 'auth', description: '认证相关' },
      { name: 'user', description: '用户相关' },
      { name: 'chat', description: '对话相关' },
      { name: 'upload', description: '文件上传' },
      { name: 'knowledge', description: '知识库管理' },
    ],
  },
})

await fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
})

const prisma = new PrismaClient()
fastify.decorate('prisma', prisma)

let redis: Redis | null = null
if (config.redisUrl) {
  redis = new Redis(config.redisUrl)
  fastify.decorate('redis', redis)
} else {
  fastify.decorate('redis', null)
}

fastify.setErrorHandler(errorHandler)

fastify.register(authRoutes, { prefix: '/api/v1/auth' })
fastify.register(userRoutes, { prefix: '/api/v1/users' })
fastify.register(conversationRoutes, { prefix: '/api/v1/conversations' })
fastify.register(chatRoutes, { prefix: '/api/v1/chat' })
fastify.register(uploadRoutes, { prefix: '/api/v1/upload' })
fastify.register(knowledgeRoutes, { prefix: '/api/v1/knowledge' })

fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  llm: {
    provider: config.llm.provider,
    model: config.llm.ollama.model,
  },
}))

const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' })
    console.log(`🚀 Server running on http://localhost:${config.port}`)
    console.log(`📚 API Docs: http://localhost:${config.port}/docs`)
    console.log(`🤖 LLM Provider: ${config.llm.provider}`)
    console.log(`📝 RAG Model: ${config.llm.ollama.model}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

const gracefulShutdown = async () => {
  console.log('\n🛑 Shutting down gracefully...')
  await fastify.close()
  await prisma.$disconnect()
  if (redis) await redis.quit()
  process.exit(0)
}

process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)

start()
