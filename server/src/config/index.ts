import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/zhiliao?schema=public'),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().default('your-super-secret-jwt-key-at-least-32-characters-long'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().default('your-super-secret-cookie-key-at-least-32-characters'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  ALIYUN_ACCESS_KEY_ID: z.string().optional(),
  ALIYUN_ACCESS_KEY_SECRET: z.string().optional(),
  ALIYUN_SMS_SIGN_NAME: z.string().optional(),
  ALIYUN_SMS_TEMPLATE_CODE: z.string().optional(),
  
  LLM_PROVIDER: z.enum(['qwen', 'zhipu', 'moonshot', 'openai', 'ollama']).default('qwen'),
  
  QWEN_API_KEY: z.string().optional(),
  ZHIPU_API_KEY: z.string().optional(),
  MOONSHOT_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().optional(),
  
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('qwen2.5:7b'),
  OLLAMA_EMBEDDING_MODEL: z.string().default('nomic-embed-text'),
  
  EMBEDDING_PROVIDER: z.enum(['qwen', 'zhipu', 'ollama']).default('qwen'),
  EMBEDDING_DIMENSION: z.coerce.number().default(768),
  RAG_TOP_K: z.coerce.number().default(5),
  RAG_CHUNK_SIZE: z.coerce.number().default(500),
  RAG_CHUNK_OVERLAP: z.coerce.number().default(50),
})

const parsed = configSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

const env = parsed.data

export const config = {
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  logLevel: env.NODE_ENV === 'production' ? 'info' : 'debug',
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
  },
  cookieSecret: env.COOKIE_SECRET,
  corsOrigin: env.CORS_ORIGIN,
  aliyun: {
    accessKeyId: env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: env.ALIYUN_ACCESS_KEY_SECRET,
    sms: {
      signName: env.ALIYUN_SMS_SIGN_NAME,
      templateCode: env.ALIYUN_SMS_TEMPLATE_CODE,
    },
  },
  llm: {
    provider: env.LLM_PROVIDER,
    qwen: {
      apiKey: env.QWEN_API_KEY || env.OPENAI_API_KEY,
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen-turbo',
    },
    zhipu: {
      apiKey: env.ZHIPU_API_KEY,
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      model: 'glm-4-flash',
    },
    moonshot: {
      apiKey: env.MOONSHOT_API_KEY,
      baseUrl: 'https://api.moonshot.cn/v1',
      model: 'moonshot-v1-8k',
    },
    openai: {
      apiKey: env.OPENAI_API_KEY,
      baseUrl: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    },
    ollama: {
      baseUrl: env.OLLAMA_BASE_URL,
    model: env.OLLAMA_MODEL,
    embeddingModel: env.OLLAMA_EMBEDDING_MODEL,
  },
},
rag: {
  embeddingProvider: env.EMBEDDING_PROVIDER,
  embeddingDimension: env.EMBEDDING_DIMENSION,
  topK: env.RAG_TOP_K,
  chunkSize: env.RAG_CHUNK_SIZE,
  chunkOverlap: env.RAG_CHUNK_OVERLAP,
},
}
