import fetch from 'node-fetch'

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:8001'

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

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || EMBEDDING_SERVICE_URL
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      const data = await response.json() as { status: string; model_loaded: boolean }
      this.ready = data.model_loaded
      return this.ready
    } catch {
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
    try {
      const response = await fetch(`${this.baseUrl}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, normalize: true })
      })

      if (!response.ok) {
        throw new Error(`Embedding service error: ${response.status}`)
      }

      const data = await response.json() as EmbedResponse

      return data.embeddings.map((embedding, i) => ({
        embedding,
        tokenCount: Math.ceil(texts[i].length / 4)
      }))
    } catch (error) {
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
