import fetch, { AbortError } from 'node-fetch'

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:8001'
const EMBEDDING_TIMEOUT = parseInt(process.env.EMBEDDING_TIMEOUT || '10000')

export interface EmbeddingResult {
  embedding: number[]
  tokenCount: number
}

export interface EmbedResponse {
  embeddings: number[][]
  dimension: number
  count: number
}

export class BgeM3Client {
  private baseUrl: string
  private dimension: number = 1024
  private ready: boolean = false
  private healthCheckCache: { status: boolean; timestamp: number } | null = null
  private healthCheckCacheTTL = 30000

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || EMBEDDING_SERVICE_URL
  }

  async checkHealth(): Promise<boolean> {
    const now = Date.now()
    if (this.healthCheckCache && (now - this.healthCheckCache.timestamp) < this.healthCheckCacheTTL) {
      return this.healthCheckCache.status
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      const data = await response.json() as { status: string; model_loaded: boolean }
      this.ready = data.model_loaded
      this.healthCheckCache = { status: this.ready, timestamp: now }
      return this.ready
    } catch {
      clearTimeout(timeoutId)
      this.healthCheckCache = { status: false, timestamp: now }
      return false
    }
  }

  async waitForReady(maxWaitMs: number = 60000): Promise<boolean> {
    const startTime = Date.now()
    while (Date.now() - startTime < maxWaitMs) {
      if (await this.checkHealth()) {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    return false
  }

  getDimension(): number {
    return this.dimension
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const results = await this.generateBatchEmbeddings([text])
    return results[0]
  }

  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT)

    try {
      const response = await fetch(`${this.baseUrl}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, normalize: true }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Embedding service error: ${response.status}`)
      }

      const data = await response.json() as EmbedResponse

      return data.embeddings.map((embedding, i) => ({
        embedding,
        tokenCount: Math.ceil(texts[i].length / 4)
      }))
    } catch (error: unknown) {
      clearTimeout(timeoutId)
      if (error instanceof AbortError || (error instanceof Error && error.name === 'AbortError')) {
        console.error('BGE-M3 client timeout after', EMBEDDING_TIMEOUT, 'ms')
        throw new Error('嵌入服务超时，请检查服务是否正常运行')
      }
      console.error('BGE-M3 client error:', error)
      throw error
    }
  }

  async cosineSimilarity(a: number[], b: number[]): Promise<number> {
    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    normA = Math.sqrt(normA)
    normB = Math.sqrt(normB)

    if (normA === 0 || normB === 0) {
      return 0
    }

    return dotProduct / (normA * normB)
  }
}

export const bgeM3Client = new BgeM3Client()
