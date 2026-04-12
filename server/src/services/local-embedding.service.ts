import { pipeline, env } from '@xenova/transformers'

env.allowRemoteModels = true
env.allowLocalModels = false
env.remoteHost = 'https://hf-mirror.com'

export interface EmbeddingResult {
  embedding: number[]
  tokenCount: number
}

let embedder: Awaited<ReturnType<typeof pipeline>> | null = null

export class LocalEmbeddingService {
  private dimension: number = 768

  async initialize(): Promise<void> {
    if (!embedder) {
      console.log('📥 正在加载本地嵌入模型...')
      console.log('   模型: Xenova/bge-base-zh-v1.5 (768维)')
      
      embedder = await pipeline(
        'feature-extraction',
        'Xenova/bge-base-zh-v1.5',
        { quantized: true }
      )
      
      console.log('✅ 本地嵌入模型加载完成')
    }
  }

  getDimension(): number {
    return this.dimension
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!embedder) {
      await this.initialize()
    }

    const truncated = text.slice(0, 512)
    const output = await embedder!(truncated, { pooling: 'mean', normalize: true } as any) as { data: Float32Array }
    
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

export const localEmbeddingService = new LocalEmbeddingService()
