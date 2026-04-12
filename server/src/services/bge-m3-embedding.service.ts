import { pipeline, env } from '@xenova/transformers'

env.allowRemoteModels = true
env.allowLocalModels = false
env.remoteHost = 'https://hf-mirror.com'

export interface EmbeddingResult {
  embedding: number[]
  tokenCount: number
}

let embedder: Awaited<ReturnType<typeof pipeline>> | null = null

export class BgeM3EmbeddingService {
  private dimension: number = 1024

  async initialize(): Promise<void> {
    if (!embedder) {
      console.log('📥 正在加载多语言嵌入模型...')
      console.log('   模型: BAAI/bge-m3 (1024维, 支持100+语言)')
      console.log('   首次加载需要下载约 2GB，请耐心等待...')
      
      embedder = await pipeline(
        'feature-extraction',
        'BAAI/bge-m3',
        { quantized: false }
      )
      
      console.log('✅ 多语言嵌入模型加载完成')
    }
  }

  getDimension(): number {
    return this.dimension
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!embedder) {
      await this.initialize()
    }

    const truncated = text.slice(0, 8192)
    const output = await embedder!(truncated, { pooling: 'cls', normalize: true } as any) as { data: Float32Array }
    
    return {
      embedding: Array.from(output.data),
      tokenCount: Math.ceil(text.length / 4),
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
      throw new Error('Vectors must have the same dimension')
    }

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

export const bgeM3EmbeddingService = new BgeM3EmbeddingService()
