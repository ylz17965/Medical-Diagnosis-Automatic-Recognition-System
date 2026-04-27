import Redis from 'ioredis'
import { createLogger } from '../utils/logger.js'
import { createHash } from 'crypto'

const log = createLogger('redis-cache')

const DEFAULT_TTL = {
  queryResult: 3600,
  embedding: 86400,
  chatContext: 7200,
  rateLimit: 60,
}

export class RedisCacheService {
  private client: Redis | null = null
  private isConnected = false
  private redisUrl: string

  constructor() {
    this.redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  }

  async connect(): Promise<void> {
    if (this.isConnected && this.client) return

    try {
      this.client = new Redis(this.redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 200, 2000)
          return delay
        },
        lazyConnect: true,
      })

      this.client.on('connect', () => {
        this.isConnected = true
        log.info('Redis connected')
      })

      this.client.on('error', (err) => {
        log.warn({ error: err.message }, 'Redis connection error')
        this.isConnected = false
      })

      this.client.on('close', () => {
        this.isConnected = false
        log.warn('Redis connection closed')
      })

      await this.client.connect()
      this.isConnected = true
      log.info({ url: this.redisUrl }, 'Redis cache service initialized')
    } catch (error: any) {
      log.warn({ error: error.message }, 'Redis connection failed, caching disabled')
      this.isConnected = false
      this.client = null
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit()
      this.client = null
      this.isConnected = false
    }
  }

  get connected(): boolean {
    return this.isConnected
  }

  private hashKey(input: string): string {
    return createHash('md5').update(input).digest('hex')
  }

  // ============= RAG Query Cache =============

  async getCachedQueryResult(query: string, category?: string): Promise<any[] | null> {
    if (!this.client || !this.isConnected) return null

    const key = `rag:query:${this.hashKey(`${query}:${category || ''}`)}`
    try {
      const cached = await this.client.get(key)
      if (cached) {
        log.debug({ query: query.slice(0, 50) }, 'RAG query cache hit')
        return JSON.parse(cached)
      }
      return null
    } catch {
      return null
    }
  }

  async setCachedQueryResult(query: string, category: string | undefined, results: any[], ttl?: number): Promise<void> {
    if (!this.client || !this.isConnected) return

    const key = `rag:query:${this.hashKey(`${query}:${category || ''}`)}`
    try {
      await this.client.setex(key, ttl || DEFAULT_TTL.queryResult, JSON.stringify(results))
    } catch (error: any) {
      log.warn({ error: error.message }, 'Failed to cache query result')
    }
  }

  // ============= Embedding Cache =============

  async getCachedEmbedding(text: string): Promise<number[] | null> {
    if (!this.client || !this.isConnected) return null

    const key = `emb:${this.hashKey(text.slice(0, 500))}`
    try {
      const cached = await this.client.get(key)
      if (cached) {
        log.debug('Embedding cache hit')
        return JSON.parse(cached)
      }
      return null
    } catch {
      return null
    }
  }

  async setCachedEmbedding(text: string, embedding: number[], ttl?: number): Promise<void> {
    if (!this.client || !this.isConnected) return

    const key = `emb:${this.hashKey(text.slice(0, 500))}`
    try {
      await this.client.setex(key, ttl || DEFAULT_TTL.embedding, JSON.stringify(embedding))
    } catch (error: any) {
      log.warn({ error: error.message }, 'Failed to cache embedding')
    }
  }

  // ============= Chat Context =============

  async getChatContext(sessionId: string): Promise<any[] | null> {
    if (!this.client || !this.isConnected) return null

    const key = `chat:ctx:${sessionId}`
    try {
      const cached = await this.client.get(key)
      if (cached) {
        return JSON.parse(cached)
      }
      return null
    } catch {
      return null
    }
  }

  async setChatContext(sessionId: string, context: any[], ttl?: number): Promise<void> {
    if (!this.client || !this.isConnected) return

    const key = `chat:ctx:${sessionId}`
    try {
      await this.client.setex(key, ttl || DEFAULT_TTL.chatContext, JSON.stringify(context))
    } catch (error: any) {
      log.warn({ error: error.message }, 'Failed to cache chat context')
    }
  }

  async appendChatMessage(sessionId: string, message: any, maxMessages: number = 20): Promise<void> {
    if (!this.client || !this.isConnected) return

    const key = `chat:ctx:${sessionId}`
    try {
      const existing = await this.getChatContext(sessionId) || []
      existing.push(message)
      const trimmed = existing.slice(-maxMessages)
      await this.setChatContext(sessionId, trimmed)
    } catch (error: any) {
      log.warn({ error: error.message }, 'Failed to append chat message')
    }
  }

  // ============= Rate Limiting =============

  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    if (!this.client || !this.isConnected) {
      return { allowed: true, remaining: limit, resetAt: Date.now() + windowSeconds * 1000 }
    }

    const redisKey = `rate:${key}`
    try {
      const current = await this.client.incr(redisKey)
      if (current === 1) {
        await this.client.expire(redisKey, windowSeconds)
      }
      const ttl = await this.client.ttl(redisKey)
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetAt: Date.now() + (ttl > 0 ? ttl : windowSeconds) * 1000,
      }
    } catch {
      return { allowed: true, remaining: limit, resetAt: Date.now() + windowSeconds * 1000 }
    }
  }

  // ============= Stats =============

  async getStats(): Promise<{
    connected: boolean
    keys: number
    memory: string
    hitRate: string
  }> {
    if (!this.client || !this.isConnected) {
      return { connected: false, keys: 0, memory: '0B', hitRate: 'N/A' }
    }

    try {
      const info = await this.client.info('memory')
      const keyspace = await this.client.info('keyspace')
      const dbsize = await this.client.dbsize()

      const memoryMatch = info.match(/used_memory_human:(\S+)/)
      const memory = memoryMatch ? memoryMatch[1] : '0B'

      return {
        connected: true,
        keys: dbsize,
        memory,
        hitRate: 'N/A',
      }
    } catch {
      return { connected: false, keys: 0, memory: '0B', hitRate: 'N/A' }
    }
  }

  async flushPattern(pattern: string): Promise<number> {
    if (!this.client || !this.isConnected) return 0

    try {
      const keys = await this.client.keys(pattern)
      if (keys.length > 0) {
        await this.client.del(...keys)
      }
      return keys.length
    } catch {
      return 0
    }
  }
}
