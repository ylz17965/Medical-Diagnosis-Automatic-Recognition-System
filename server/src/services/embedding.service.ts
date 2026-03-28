import { config } from '../config/index.js'

export interface EmbeddingResult {
  embedding: number[]
  tokenCount: number
}

export class EmbeddingService {
  private apiKey: string | undefined
  private baseUrl: string
  private model: string
  private dimension: number

  constructor() {
    this.apiKey = config.llm.qwen.apiKey
    this.baseUrl = config.llm.qwen.baseUrl
    this.model = 'text-embedding-v3'
    this.dimension = config.rag.embeddingDimension
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: text,
          dimensions: this.dimension,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Qwen embedding failed: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      
      return {
        embedding: data.data[0].embedding,
        tokenCount: data.usage?.total_tokens || Math.ceil(text.length / 4),
      }
    } catch (error) {
      console.error('Embedding generation error:', error)
      throw error
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = []
    
    for (const text of texts) {
      const result = await this.generateEmbedding(text)
      results.push(result)
    }
    
    return results
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }
}
