import { PrismaClient } from '@prisma/client'
import { EmbeddingService } from './embedding.service.js'
import { RerankerService } from './reranker.service.js'
import { config } from '../config/index.js'

export interface RAGContext {
  content: string
  source: string
  score: number
  metadata?: Record<string, unknown>
}

export interface ChunkResult {
  content: string
  index: number
  tokenCount: number
}

export class RAGService {
  private prisma: PrismaClient
  private embeddingService: EmbeddingService
  private rerankerService: RerankerService
  private chunkSize: number
  private chunkOverlap: number
  private topK: number
  private rerankTopK: number
  private similarityThreshold: number

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.embeddingService = new EmbeddingService()
    this.rerankerService = new RerankerService()
    this.chunkSize = config.rag.chunkSize
    this.chunkOverlap = config.rag.chunkOverlap
    this.topK = config.rag.topK
    this.rerankTopK = config.rag.rerankTopK
    this.similarityThreshold = config.rag.similarityThreshold
  }

  chunkText(text: string): ChunkResult[] {
    const chunks: ChunkResult[] = []
    const sentences = text.split(/[。！？\n]/).filter(s => s.trim())
    
    let currentChunk = ''
    let chunkIndex = 0

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim()
      if (!trimmedSentence) continue

      if (currentChunk.length + trimmedSentence.length > this.chunkSize && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          index: chunkIndex++,
          tokenCount: Math.ceil(currentChunk.length / 4),
        })
        
        const overlapStart = Math.max(0, currentChunk.length - this.chunkOverlap)
        currentChunk = currentChunk.slice(overlapStart) + trimmedSentence
      } else {
        currentChunk += (currentChunk ? '' : '') + trimmedSentence
      }
    }

    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex,
        tokenCount: Math.ceil(currentChunk.length / 4),
      })
    }

    return chunks
  }

  async indexDocument(params: {
    documentId?: string
    healthRecordId?: string
    title: string
    content: string
    source: string
    category?: string
    metadata?: Record<string, unknown>
  }): Promise<string> {
    const documentId = params.documentId || crypto.randomUUID()
    
    let knowledgeDoc = await this.prisma.knowledgeDocument.findUnique({
      where: { id: documentId },
    })

    if (!knowledgeDoc) {
      knowledgeDoc = await this.prisma.knowledgeDocument.create({
        data: {
          id: documentId,
          title: params.title,
          content: params.content,
          source: params.source,
          category: params.category || 'general',
          metadata: (params.metadata || {}) as any,
        },
      })
    }

    const chunks = this.chunkText(params.content)
    
    await this.prisma.documentChunk.deleteMany({
      where: { documentId },
    })

    const dimension = config.rag.embeddingDimension

    for (const chunk of chunks) {
      const embeddingResult = await this.embeddingService.generateEmbedding(chunk.content)
      
      await this.prisma.$executeRaw`
        INSERT INTO document_chunks (id, document_id, health_record_id, content, chunk_index, embedding, token_count, metadata, created_at)
        VALUES (
          gen_random_uuid(),
          ${documentId},
          ${params.healthRecordId || null},
          ${chunk.content},
          ${chunk.index},
          ${`[${embeddingResult.embedding.join(',')}]`}::vector(${dimension}),
          ${chunk.tokenCount},
          ${JSON.stringify(params.metadata || {})}::json,
          NOW()
        )
      `
    }

    return documentId
  }

  async searchSimilar(params: {
    query: string
    category?: string
    healthRecordId?: string
    topK?: number
  }): Promise<RAGContext[]> {
    const queryEmbedding = await this.embeddingService.generateEmbedding(params.query)
    const topK = params.topK || this.rerankTopK
    const dimension = config.rag.embeddingDimension

    let whereClause = '1=1'
    const queryParams: unknown[] = [
      `[${queryEmbedding.embedding.join(',')}]`,
      topK,
    ]

    if (params.category) {
      whereClause += ` AND kd.category = $${queryParams.length + 1}`
      queryParams.push(params.category)
    }

    if (params.healthRecordId) {
      whereClause += ` AND dc.health_record_id = $${queryParams.length + 1}`
      queryParams.push(params.healthRecordId)
    }

    const sql = `
      SELECT 
        dc.content,
        kd.source,
        kd.title,
        1 - (dc.embedding <=> $1::vector(${dimension})) as score,
        dc.metadata
      FROM document_chunks dc
      JOIN knowledge_documents kd ON dc.document_id = kd.id
      WHERE ${whereClause}
      ORDER BY dc.embedding <=> $1::vector(${dimension})
      LIMIT $2
    `

    const results = await this.prisma.$queryRawUnsafe<RAGContext[]>(
      sql,
      ...queryParams
    )

    return results.map(r => ({
      content: r.content,
      source: r.source,
      score: Number(r.score),
      metadata: r.metadata as Record<string, unknown>,
    }))
  }

  async searchWithRerank(params: {
    query: string
    category?: string
    healthRecordId?: string
    topK?: number
  }): Promise<RAGContext[]> {
    const initialResults = await this.searchSimilar({
      ...params,
      topK: this.rerankTopK,
    })

    if (initialResults.length === 0) {
      return []
    }

    const filteredResults = initialResults.filter(r => r.score >= this.similarityThreshold)

    if (filteredResults.length === 0) {
      return []
    }

    const rerankedDocs = await this.rerankerService.rerankWithDocuments(
      params.query,
      filteredResults,
      params.topK || this.topK
    )

    return rerankedDocs
  }

  async buildContextForQuery(params: {
    query: string
    category?: string
    healthRecordId?: string
    maxTokens?: number
  }): Promise<string> {
    const maxTokens = params.maxTokens || 2000
    const contexts = await this.searchWithRerank(params)
    
    let totalTokens = 0
    const selectedContexts: RAGContext[] = []

    for (const ctx of contexts) {
      const tokenCount = Math.ceil(ctx.content.length / 4)
      if (totalTokens + tokenCount > maxTokens) break
      
      selectedContexts.push(ctx)
      totalTokens += tokenCount
    }

    if (selectedContexts.length === 0) {
      return ''
    }

    const contextText = selectedContexts
      .map((ctx, i) => `[参考资料 ${i + 1}]\n来源: ${ctx.source}\n内容: ${ctx.content}`)
      .join('\n\n---\n\n')

    return contextText
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.prisma.documentChunk.deleteMany({
      where: { documentId },
    })
    
    await this.prisma.knowledgeDocument.delete({
      where: { id: documentId },
    })
  }

  async getDocumentStats(): Promise<{
    totalDocuments: number
    totalChunks: number
    categories: string[]
  }> {
    const [docCount, chunkCount, categories] = await Promise.all([
      this.prisma.knowledgeDocument.count(),
      this.prisma.documentChunk.count(),
      this.prisma.knowledgeDocument.findMany({
        select: { category: true },
        distinct: ['category'],
      }),
    ])

    return {
      totalDocuments: docCount,
      totalChunks: chunkCount,
      categories: categories.map(c => c.category),
    }
  }
}
