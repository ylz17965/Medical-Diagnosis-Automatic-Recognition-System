import { RerankerService } from './reranker.service.js'
import { EmbeddingService } from './embedding.service.js'
import { RedisCacheService } from './redis-cache.service.js'
import { config } from '../config/index.js'
import { PrismaClient } from '@prisma/client'
import { createLogger } from '../utils/logger.js'

const log = createLogger('rag-service')

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
  metadata?: Record<string, unknown>
}

interface RAGSearchResult {
  content: string
  source: string
  score: number
  documentId?: string
  chunkIndex?: number
  metadata?: Record<string, unknown>
}

export class RAGService {
  private prisma: PrismaClient
  private embeddingService: EmbeddingService
  private redisCache: RedisCacheService
  private rerankerService: RerankerService
  private chunkSize: number
  private chunkOverlap: number
  private topK: number
  private rerankTopK: number
  private similarityThreshold: number
  private hasKnowledgeBase: boolean | null = null
  private lastStatsCheck: number = 0
  private statsCacheDuration = 60000
  private isReady: boolean = false

  constructor(prisma: PrismaClient, redisCache: RedisCacheService) {
    this.prisma = prisma
    this.redisCache = redisCache
    this.embeddingService = new EmbeddingService(redisCache)
    this.rerankerService = new RerankerService()
    this.chunkSize = config.rag.chunkSize
    this.chunkOverlap = config.rag.chunkOverlap
    this.topK = config.rag.topK
    this.rerankTopK = config.rag.rerankTopK
    this.similarityThreshold = config.rag.similarityThreshold
  }

  async initialize(): Promise<void> {
    if (this.isReady) return
    log.info('RAG service initializing...')
    this.isReady = true
    log.info('RAG service ready')
  }

  private async checkKnowledgeBaseExists(): Promise<boolean> {
    const now = Date.now()
    if (this.hasKnowledgeBase !== null && (now - this.lastStatsCheck) < this.statsCacheDuration) {
      return this.hasKnowledgeBase
    }
    const chunkCount = await this.prisma.documentChunk.count()
    this.hasKnowledgeBase = chunkCount > 0
    this.lastStatsCheck = now
    return this.hasKnowledgeBase
  }

  chunkText(text: string): ChunkResult[] {
    return this.recursiveCharacterSplit(text, this.chunkSize, this.chunkOverlap)
  }

  private recursiveCharacterSplit(
    text: string,
    chunkSize: number,
    chunkOverlap: number,
    separators: string[] = ['\n\n', '。', '！', '？', '；', '\n', ' ', '']
  ): ChunkResult[] {
    const chunks: ChunkResult[] = []
    const finalSeparator = separators[separators.length - 1]
    const currentSeparators = separators.length > 0 ? separators : [finalSeparator]

    const separator = currentSeparators[0]
    const remainingSeparators = currentSeparators.slice(1)

    const splits = separator === '' ? Array.from(text).map(c => c) : text.split(separator)
    const goodSplits: string[] = []
    let currentDoc: string[] = []
    let chunkIndex = 0

    for (const split of splits) {
      const s = split.trim()
      if (!s) continue

      if (s.length > chunkSize) {
        if (currentDoc.length > 0) {
          const merged = currentDoc.join(separator)
          if (merged.trim()) {
            if (merged.length <= chunkSize) {
              chunks.push({ content: merged.trim(), index: chunkIndex++, tokenCount: Math.ceil(merged.length / 4) })
            } else {
              const subChunks = this.recursiveCharacterSplit(merged, chunkSize, chunkOverlap, remainingSeparators)
              for (const sc of subChunks) {
                chunks.push({ ...sc, index: chunkIndex++ })
              }
            }
          }
          currentDoc = []
        }

        const subChunks = this.recursiveCharacterSplit(s, chunkSize, chunkOverlap, remainingSeparators)
        for (const sc of subChunks) {
          chunks.push({ ...sc, index: chunkIndex++ })
        }
      } else {
        const prospectiveLength = currentDoc.join(separator).length + (currentDoc.length > 0 ? separator.length : 0) + s.length
        if (prospectiveLength <= chunkSize) {
          currentDoc.push(s)
        } else {
          if (currentDoc.length > 0) {
            const merged = currentDoc.join(separator)
            if (merged.trim()) {
              if (merged.length <= chunkSize) {
                chunks.push({ content: merged.trim(), index: chunkIndex++, tokenCount: Math.ceil(merged.length / 4) })
              } else {
                const subChunks = this.recursiveCharacterSplit(merged, chunkSize, chunkOverlap, remainingSeparators)
                for (const sc of subChunks) {
                  chunks.push({ ...sc, index: chunkIndex++ })
                }
              }
            }
          }
          currentDoc = [s]
        }
      }
    }

    if (currentDoc.length > 0) {
      const merged = currentDoc.join(separator)
      if (merged.trim()) {
        if (merged.length <= chunkSize) {
          chunks.push({ content: merged.trim(), index: chunkIndex, tokenCount: Math.ceil(merged.length / 4) })
        } else {
          const subChunks = this.recursiveCharacterSplit(merged, chunkSize, chunkOverlap, remainingSeparators)
          for (const sc of subChunks) {
            chunks.push({ ...sc, index: chunkIndex++ })
          }
        }
      }
    }

    const result = this.mergeSmallChunks(chunks, chunkSize, chunkOverlap)
    return result.map((c, i) => ({ ...c, index: i }))
  }

  private mergeSmallChunks(chunks: ChunkResult[], chunkSize: number, chunkOverlap: number): ChunkResult[] {
    if (chunks.length <= 1) return chunks

    const merged: ChunkResult[] = []
    let current = { ...chunks[0] }

    for (let i = 1; i < chunks.length; i++) {
      const prospectiveLength = current.content.length + chunks[i].content.length
      if (prospectiveLength <= chunkSize * 0.5) {
        current.content = current.content + '\n' + chunks[i].content
        current.tokenCount = Math.ceil(current.content.length / 4)
      } else {
        merged.push(current)
        current = { ...chunks[i] }
      }
    }
    merged.push(current)
    return merged
  }

  async generateQueryEmbedding(query: string): Promise<number[]> {
    const result = await this.embeddingService.generateEmbedding(query)
    return result.embedding
  }

  async indexDocument(params: {
    title: string
    content: string
    source: string
    category: string
    metadata?: Record<string, unknown>
    healthRecordId?: string
  }): Promise<string> {
    if (!this.isReady) await this.initialize()
    const chunks = this.chunkText(params.content)
    if (chunks.length === 0) throw new Error('无法分块：内容为空')
    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}}`
    await this.prisma.knowledgeDocument.create({
      data: { id: documentId, title: params.title, content: params.content, source: params.source, category: params.category, metadata: JSON.parse(JSON.stringify(params.metadata || {})) },
    })
    const dimension = config.rag.embeddingDimension
    for (const chunk of chunks) {
      const embeddingResult = await this.generateQueryEmbedding(chunk.content)
      await this.prisma.$executeRawUnsafe(`
        INSERT INTO document_chunks (id, "documentId", content, "chunkIndex", embedding, "tokenCount", metadata, "createdAt")
        VALUES ($1, $2, $3, $4, $5::vector(${dimension}), $6, $7::json, NOW())
      `, `chunk-${documentId}-${chunk.index}`, documentId, chunk.content, chunk.index, `[${embeddingResult.join(',')}]`, chunk.tokenCount, JSON.stringify(params.metadata || {}))
    }
    this.hasKnowledgeBase = true
    this.lastStatsCheck = Date.now()
    return documentId
  }

  async deleteDocument(documentId: string): Promise<void> {
    if (!this.isReady) await this.initialize()
    await this.prisma.documentChunk.deleteMany({ where: { documentId } })
    await this.prisma.knowledgeDocument.delete({ where: { id: documentId } })
    log.info({ documentId }, 'Document deleted')
  }

  async searchSimilar(params: {
    query: string
    category?: string
    healthRecordId?: string
    topK?: number
    mergeChunks?: boolean
  }): Promise<RAGContext[]> {
    if (!this.isReady) await this.initialize()
    const hasKB = await this.checkKnowledgeBaseExists()
    if (!hasKB) return []

    const queryEmbedding = await this.generateQueryEmbedding(params.query)
    const topK = params.topK || this.rerankTopK
    const dimension = config.rag.embeddingDimension

    let whereClause = '1=1'
    const queryParams: unknown[] = [`[${queryEmbedding.join(',')}]`, topK * 2]
    if (params.category) {
      whereClause += ` AND kd.category = $${queryParams.length + 1}`
      queryParams.push(params.category)
    }
    if (params.healthRecordId) {
      whereClause += ` AND dc."healthRecordId" = $${queryParams.length + 1}`
      queryParams.push(params.healthRecordId)
    }

    const sql = `
      SELECT dc.content, dc."documentId", dc."chunkIndex", kd.source, kd.title,
        1 - (dc.embedding <=> $1::vector(${dimension})) as score, dc.metadata
      FROM document_chunks dc
      JOIN knowledge_documents kd ON dc."documentId" = kd.id
      WHERE ${whereClause}
      ORDER BY dc.embedding <=> $1::vector(${dimension})
      LIMIT $2
    `

    const results = await this.prisma.$queryRawUnsafe<RAGSearchResult[]>(sql, ...queryParams)
    const merged = params.mergeChunks !== false
      ? this.mergeAdjacentChunks(results)
      : results.map(r => ({ content: r.content, source: r.source, score: Number(r.score), documentId: r.documentId, chunkIndex: r.chunkIndex, metadata: r.metadata as Record<string, unknown> }))

    return merged.filter(r => r.score >= this.similarityThreshold).slice(0, params.topK || this.topK)
  }

  private mergeAdjacentChunks(results: RAGSearchResult[]): RAGContext[] {
    if (results.length === 0) return []
    const documentGroups = new Map<string, Map<number, RAGSearchResult[]>>()
    for (const r of results) {
      const docId = r.documentId || 'unknown'
      const chunkIndex = r.chunkIndex ?? 0
      if (!documentGroups.has(docId)) documentGroups.set(docId, new Map())
      const docChunks = documentGroups.get(docId)!
      if (!docChunks.has(chunkIndex)) docChunks.set(chunkIndex, [])
      docChunks.get(chunkIndex)!.push(r)
    }
    const merged: RAGContext[] = []
    for (const [docId, chunkMap] of documentGroups) {
      const sortedIndexes = Array.from(chunkMap.keys()).sort((a, b) => a - b)
      let currentContent = '', currentScore = 0, source = '', metadata: Record<string, unknown> = {}, startIndex = -1
      for (const chunkIndex of sortedIndexes) {
        const chunks = chunkMap.get(chunkIndex)!
        const bestChunk = chunks.reduce((best, curr) => Number(curr.score) > Number(best.score) ? curr : best)
        if (source === '') { source = bestChunk.source; metadata = bestChunk.metadata || {} }
        if (startIndex === -1) { startIndex = chunkIndex; currentContent = bestChunk.content; currentScore = Number(bestChunk.score) }
        else if (chunkIndex === startIndex + currentContent.split('\n').length) { currentContent += '\n' + bestChunk.content; currentScore = Math.max(currentScore, Number(bestChunk.score)) }
        else { merged.push({ content: currentContent, source, score: currentScore, metadata: { ...metadata, documentId: docId, chunkIndex: startIndex } }); startIndex = chunkIndex; currentContent = bestChunk.content; currentScore = Number(bestChunk.score) }
      }
      if (currentContent) merged.push({ content: currentContent, source, score: currentScore, metadata: { ...metadata, documentId: docId, chunkIndex: startIndex } })
    }
    merged.sort((a, b) => b.score - a.score)
    return merged
  }

  async searchKeyword(params: {
    query: string
    category?: string
    healthRecordId?: string
    topK?: number
  }): Promise<RAGContext[]> {
    if (!this.isReady) await this.initialize()
    const hasKB = await this.checkKnowledgeBaseExists()
    if (!hasKB) return []
    const topK = params.topK || this.rerankTopK
    const searchTerms = params.query.split(/[\s，。！？、；：]+/).filter(w => w.length >= 2).map(w => w.toLowerCase()).slice(0, 10)
    if (searchTerms.length === 0) return []
    let whereClause = '1=1'
    const queryParams: unknown[] = [topK]
    for (const term of searchTerms) { whereClause += ` AND LOWER(dc.content) LIKE $${queryParams.length + 1}`; queryParams.push(`%${term}%`) }
    if (params.category) { whereClause += ` AND kd.category = $${queryParams.length + 1}`; queryParams.push(params.category) }
    if (params.healthRecordId) { whereClause += ` AND dc."healthRecordId" = $${queryParams.length + 1}`; queryParams.push(params.healthRecordId) }
    const sql = `SELECT dc.content, kd.source, kd.title, 0.5 as score, dc.metadata FROM document_chunks dc JOIN knowledge_documents kd ON dc."documentId" = kd.id WHERE ${whereClause} LIMIT $1`
    const results = await this.prisma.$queryRawUnsafe<RAGContext[]>(sql, ...queryParams)
    return results.map(r => ({ content: r.content, source: r.source, score: Number(r.score), metadata: r.metadata as Record<string, unknown> }))
  }

  async searchHybrid(params: {
    query: string
    category?: string
    healthRecordId?: string
    topK?: number
    vectorWeight?: number
  }): Promise<RAGContext[]> {
    const vectorWeight = params.vectorWeight ?? 0.7
    const [vectorResults, keywordResults] = await Promise.all([
      this.searchSimilar({ ...params, topK: params.topK || this.rerankTopK }),
      this.searchKeyword({ ...params, topK: Math.ceil((params.topK || this.rerankTopK) / 2) }),
    ])
    const mergedMap = new Map<string, { content: string; source: string; score: number; metadata?: Record<string, unknown>; vectorScore: number; keywordScore: number }>()
    for (const r of vectorResults) { mergedMap.set(r.content.substring(0, 100), { content: r.content, source: r.source, score: r.score, vectorScore: r.score, keywordScore: 0, metadata: r.metadata }) }
    for (const r of keywordResults) {
      const key = r.content.substring(0, 100)
      const existing = mergedMap.get(key)
      if (existing) { existing.keywordScore = r.score; existing.score = existing.vectorScore * vectorWeight + r.score * (1 - vectorWeight) }
      else { mergedMap.set(key, { content: r.content, source: r.source, score: r.score * (1 - vectorWeight), vectorScore: 0, keywordScore: r.score, metadata: r.metadata }) }
    }
    const merged = Array.from(mergedMap.values())
    merged.sort((a, b) => b.score - a.score)
    return merged.slice(0, params.topK || this.topK)
  }

  async searchWithRerank(params: {
    query: string
    category?: string
    healthRecordId?: string
    topK?: number
    useHybrid?: boolean
  }): Promise<RAGContext[]> {
    const cached = await this.redisCache.getCachedQueryResult(params.query, params.category)
    if (cached) {
      log.debug({ query: params.query.slice(0, 30) }, 'RAG query cache hit (Redis)')
      return cached.slice(0, params.topK || this.topK)
    }

    const hasKB = await this.checkKnowledgeBaseExists()
    if (!hasKB) return []

    const initialResults = params.useHybrid !== false
      ? await this.searchHybrid({ ...params, topK: params.topK || this.topK, vectorWeight: 0.7 })
      : await this.searchSimilar({ ...params, topK: params.topK || this.topK })

    if (initialResults.length === 0) return []

    const results = initialResults.slice(0, params.topK || this.topK)

    await this.redisCache.setCachedQueryResult(params.query, params.category, results)

    return results
  }

  async buildContextForQuery(params: {
    query: string
    category?: string
    healthRecordId?: string
    topK?: number
  }): Promise<string> {
    const results = await this.searchWithRerank({ query: params.query, category: params.category, healthRecordId: params.healthRecordId, topK: params.topK })
    if (results.length === 0) return ''
    return results.map((r, i) => `[资料${i + 1}] ${r.content}\n来源: ${r.source}\n相关度: ${(r.score * 100).toFixed(1)}%`).join('\n\n---\n\n')
  }

  async getDocumentStats(): Promise<{ totalDocuments: number; totalChunks: number; categories: string[] }> {
    const [totalDocuments, totalChunks, docResults] = await Promise.all([
      this.prisma.knowledgeDocument.count(),
      this.prisma.documentChunk.count(),
      this.prisma.knowledgeDocument.findMany({ select: { category: true } }),
    ])
    return { totalDocuments, totalChunks, categories: [...new Set(docResults.map(d => d.category))] }
  }
}
