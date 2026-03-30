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
  
  QWEN_API_KEY: z.string().optional(),
  QWEN_BASE_URL: z.string().default('https://dashscope.aliyuncs.com/compatible-mode/v1'),
  
  QWEN_MODEL_COMPLEX: z.string().default('qwen-max'),
  QWEN_MODEL_SIMPLE: z.string().default('qwen3.5-flash'),
  QWEN_MODEL_EMBEDDING: z.string().default('text-embedding-v3'),
  QWEN_MODEL_RERANK: z.string().default('qwen3-rerank'),
  QWEN_MODEL_VISION: z.string().default('qwen3-vl-plus'),
  QWEN_MODEL_OCR: z.string().default('qwen-vl-ocr'),
  
  EMBEDDING_DIMENSION: z.coerce.number().default(1024),
  RAG_TOP_K: z.coerce.number().default(5),
  RAG_RERANK_TOP_K: z.coerce.number().default(20),
  RAG_CHUNK_SIZE: z.coerce.number().default(512),
  RAG_CHUNK_OVERLAP: z.coerce.number().default(128),
  RAG_SIMILARITY_THRESHOLD: z.coerce.number().default(0.7),
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
  qwen: {
    apiKey: env.QWEN_API_KEY,
    baseUrl: env.QWEN_BASE_URL,
    models: {
      complex: env.QWEN_MODEL_COMPLEX,
      simple: env.QWEN_MODEL_SIMPLE,
      embedding: env.QWEN_MODEL_EMBEDDING,
      rerank: env.QWEN_MODEL_RERANK,
      vision: env.QWEN_MODEL_VISION,
      ocr: env.QWEN_MODEL_OCR,
    },
  },
  rag: {
    embeddingDimension: env.EMBEDDING_DIMENSION,
    topK: env.RAG_TOP_K,
    rerankTopK: env.RAG_RERANK_TOP_K,
    chunkSize: env.RAG_CHUNK_SIZE,
    chunkOverlap: env.RAG_CHUNK_OVERLAP,
    similarityThreshold: env.RAG_SIMILARITY_THRESHOLD,
  },
}
