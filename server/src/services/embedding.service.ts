import { config } from '../config/index.js'
import { createLogger } from '../utils/logger.js'
import type { RedisCacheService } from './redis-cache.service.js'

const log = createLogger('embedding')

export interface EmbeddingResult {
  embedding: number[]
  tokenCount: number
}

export class EmbeddingService {
  private apiKey: string | undefined
  private baseUrl: string
  private model: string
  private dimension: number
  private provider: 'local' | 'qwen' | 'siliconflow'
  private ollamaUrl: string
  private ollamaModel: string
  private siliconflowUrl: string
  private siliconflowApiKey: string | undefined
  private siliconflowModel: string
  private redisCache: RedisCacheService | null = null

  constructor(redisCache?: RedisCacheService) {
    this.redisCache = redisCache || null
    this.provider = (process.env.EMBEDDING_PROVIDER as 'local' | 'qwen' | 'siliconflow') || 
      (process.env.USE_LOCAL_EMBEDDINGS === 'true' ? 'local' : 'qwen')
    this.apiKey = config.qwen.apiKey
    this.baseUrl = config.qwen.baseUrl
    this.model = config.qwen.models.embedding
    this.dimension = config.rag.embeddingDimension
    this.ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    this.ollamaModel = process.env.OLLAMA_EMBEDDING_MODEL || 'bge-m3'
    this.siliconflowUrl = process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1'
    this.siliconflowApiKey = process.env.SILICONFLOW_API_KEY
    this.siliconflowModel = process.env.SILICONFLOW_EMBEDDING_MODEL || 'BAAI/bge-m3'
    log.info(`Embedding provider: ${this.provider}`)
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    // Check Redis cache first
    if (this.redisCache) {
      const cached = await this.redisCache.getCachedEmbedding(text)
      if (cached) {
        return { embedding: cached, tokenCount: Math.ceil(text.length / 4) }
      }
    }

    let result: EmbeddingResult
    switch (this.provider) {
      case 'local':
        result = await this.generateLocalEmbedding(text)
        break
      case 'siliconflow':
        result = await this.generateSiliconFlowEmbedding(text)
        break
      case 'qwen':
      default:
        result = await this.generateQwenEmbedding(text)
        break
    }

    // Cache the result
    if (this.redisCache && result.embedding) {
      await this.redisCache.setCachedEmbedding(text, result.embedding)
    }

    return result
  }

  private async generateQwenEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.apiKey) throw new Error('QWEN_API_KEY is not configured')
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, input: text, dimensions: this.dimension }),
    })
    if (!response.ok) throw new Error(`Qwen Embedding API failed: ${response.status} ${await response.text()}`)
    const data = await response.json()
    return { embedding: data.data[0].embedding, tokenCount: data.usage?.total_tokens || Math.ceil(text.length / 4) }
  }

  private async generateSiliconFlowEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.siliconflowApiKey) throw new Error('SILICONFLOW_API_KEY is not configured. Get one free at https://cloud.siliconflow.cn')
    const response = await fetch(`${this.siliconflowUrl}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.siliconflowApiKey}` },
      body: JSON.stringify({ model: this.siliconflowModel, input: text, encoding_format: 'float' }),
    })
    if (!response.ok) throw new Error(`SiliconFlow API failed: ${response.status} ${await response.text()}`)
    const data = await response.json()
    return { embedding: data.data[0].embedding, tokenCount: data.usage?.total_tokens || Math.ceil(text.length / 4) }
  }

  private async generateLocalEmbedding(text: string): Promise<EmbeddingResult> {
    const response = await fetch(`${this.ollamaUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.ollamaModel, input: text }),
    })
    if (!response.ok) throw new Error(`Ollama embed failed: ${response.status} ${await response.text()}`)
    const data = await response.json() as { embeddings: number[][] }
    return { embedding: data.embeddings[0], tokenCount: Math.ceil(text.length / 4) }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = []
    for (const text of texts) {
      results.push(await this.generateEmbedding(text))
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return results
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) throw new Error('Vectors must have the same length')
    let dotProduct = 0, normA = 0, normB = 0
    for (let i = 0; i < a.length; i++) { dotProduct += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i] }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }
}
