import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { PrismaClient } from '@prisma/client'
import { RedisCacheService } from './services/redis-cache.service.js'
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
import imageRoutes from './routes/image.routes.js'
import knowledgeGraphRoutes from './knowledge_graph/routes.js'
import hybridSearchRoutes from './routes/hybrid-search.routes.js'
import explainableRAGRoutes from './routes/explainable-rag.routes.js'
import dialogRoutes from './routes/dialog.routes.js'
import testRoutes from './tests/routes.js'
import userTestRoutes from './tests/user-test-routes.js'
import { federatedRoutes } from './routes/federated.routes.js'
import { dashboardRoutes } from './routes/dashboard.routes.js'
import agentRoutes from './routes/agent.routes.js'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
    redisCache: RedisCacheService
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
        connectSrc: ["'self'", config.corsOrigin, config.qwen.baseUrl],
      },
    }
    : false,
})

await fastify.register(cors, {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-session-id', 'x-api-key', 'x-api-base-url', 'x-model-complex', 'x-model-simple', 'x-model-vision', 'x-model-embedding'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Content-Type', 'Cache-Control', 'Connection'],
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
      { name: 'image', description: '图片识别' },
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

const redisCache = new RedisCacheService()
await redisCache.connect()
fastify.decorate('redisCache', redisCache)

fastify.setErrorHandler(errorHandler)

fastify.register(authRoutes, { prefix: '/api/v1/auth' })
fastify.register(userRoutes, { prefix: '/api/v1/users' })
fastify.register(conversationRoutes, { prefix: '/api/v1/conversations' })
fastify.register(chatRoutes, { prefix: '/api/v1/chat' })
fastify.register(uploadRoutes, { prefix: '/api/v1/upload' })
fastify.register(knowledgeRoutes, { prefix: '/api/v1/knowledge' })
fastify.register(imageRoutes, { prefix: '/api/v1/image' })
fastify.register(knowledgeGraphRoutes, { prefix: '/api/v1/kg' })
fastify.register(hybridSearchRoutes, { prefix: '/api/v1/hybrid' })
fastify.register(explainableRAGRoutes, { prefix: '/api/v1/explain' })
fastify.register(dialogRoutes, { prefix: '/api/v1/dialog' })
fastify.register(testRoutes, { prefix: '/api/v1/tests' })
fastify.register(userTestRoutes, { prefix: '/api/v1/user-test' })
fastify.register(federatedRoutes, { prefix: '/api/v1/federated' })
fastify.register(dashboardRoutes, { prefix: '/api/v1/dashboard' })
fastify.register(agentRoutes, { prefix: '/api/v1/agents' })

fastify.get('/', async () => ({
  name: 'AI健康助手 API',
  version: '1.0.0',
  description: '基于知识图谱增强的可信医疗RAG系统',
  endpoints: {
    health: '/health',
    docs: '/docs',
    api: '/api/v1',
  },
  links: {
    chat: '/api/v1/chat',
    knowledge: '/api/v1/knowledge',
    knowledgeGraph: '/api/v1/kg',
    tests: '/api/v1/tests',
    userTest: '/api/v1/user-test',
  },
}))

fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  models: {
    complex: config.qwen.models.complex,
    simple: config.qwen.models.simple,
    embedding: config.qwen.models.embedding,
    rerank: config.qwen.models.rerank,
    vision: config.qwen.models.vision,
    ocr: config.qwen.models.ocr,
  },
}))

const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' })
    console.log(`🚀 Server running on http://localhost:${config.port}`)
    console.log(`📚 API Docs: http://localhost:${config.port}/docs`)
    console.log(`🤖 LLM Models: ${config.qwen.models.complex} / ${config.qwen.models.simple}`)
    console.log(`🔍 Embedding: ${config.qwen.models.embedding}`)
    console.log(`👁️ Vision: ${config.qwen.models.vision} / ${config.qwen.models.ocr}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

const gracefulShutdown = async () => {
  console.log('\n🛑 Shutting down gracefully...')
  await fastify.close()
  await prisma.$disconnect()
  await redisCache.disconnect()
  process.exit(0)
}

process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)

start()
