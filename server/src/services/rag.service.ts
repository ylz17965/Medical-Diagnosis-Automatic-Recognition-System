import { bgeM3Client, BgeM3Client } from './bge-m3-client.service.js'
import { RerankerService } from './reranker.service.js'
import { config } from '../config/index.js'
import { PrismaClient } from '@prisma/client'

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
  private embeddingClient: BgeM3Client
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

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.embeddingClient = bgeM3Client
    this.rerankerService = new RerankerService()
    this.chunkSize = config.rag.chunkSize
    this.chunkOverlap = config.rag.chunkOverlap
    this.topK = config.rag.topK
    this.rerankTopK = config.rag.rerankTopK
    this.similarityThreshold = config.rag.similarityThreshold
  }

  async initialize(): Promise<void> {
    if (this.isReady) return
    
    console.log('🔄 正在连接 BGE-M3 嵌入服务...')
    const ready = await this.embeddingClient.waitForReady(60000)
    
    if (!ready) {
      throw new Error('BGE-M3 嵌入服务未启动，请先运行: python embedding_server.py')
    }
    
    this.isReady = true
    console.log('✅ BGE-M3 嵌入服务已连接')
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

  chunkTextSemantic(text: string): ChunkResult[] {
    const chunks: ChunkResult[] = []
    
    const sections = text.split(/\n\n+/)
    
    let currentChunk = ''
    let chunkIndex = 0
    let currentSectionType: 'header' | 'content' = 'content'

    for (const section of sections) {
      const trimmedSection = section.trim()
      if (!trimmedSection) continue

      const isHeader = /^[一二三四五六七八九十\d]+[、\.．\s]|^[【\[].*[\]】]|^[A-Z][A-Z\s]+:|^#{1,3}\s/.test(trimmedSection)
      
      if (isHeader && currentChunk.length > this.chunkSize * 0.3) {
        if (currentChunk.trim()) {
          chunks.push({
            content: currentChunk.trim(),
            index: chunkIndex++,
            tokenCount: Math.ceil(currentChunk.length / 4),
            metadata: { sectionType: currentSectionType },
          })
        }
        currentChunk = trimmedSection
        currentSectionType = 'header'
      } else if (currentChunk.length + trimmedSection.length > this.chunkSize && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          index: chunkIndex++,
          tokenCount: Math.ceil(currentChunk.length / 4),
          metadata: { sectionType: currentSectionType },
        })
        
        const sentences = trimmedSection.split(/[。！？]/).filter(s => s.trim())
        const overlapText = sentences.slice(0, 2).join('。')
        currentChunk = overlapText.length > 0 ? overlapText + '。' + trimmedSection : trimmedSection
        currentSectionType = 'content'
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmedSection
        if (!isHeader) currentSectionType = 'content'
      }
    }

    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex,
        tokenCount: Math.ceil(currentChunk.length / 4),
        metadata: { sectionType: currentSectionType },
      })
    }

    console.log(`[RAG] Semantic chunking: ${sections.length} sections -> ${chunks.length} chunks`)
    return chunks
  }

  chunkTextAdaptive(text: string, options?: { preferSemantic?: boolean }): ChunkResult[] {
    const hasStructure = /[一二三四五六七八九十]+[、\.．]|#{1,3}\s|【.*】/.test(text)
    
    if (hasStructure || options?.preferSemantic) {
      return this.chunkTextSemantic(text)
    }
    
    return this.chunkText(text)
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
    if (!this.isReady) {
      await this.initialize()
    }

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

    const chunks = this.chunkTextAdaptive(params.content)
    
    await this.prisma.documentChunk.deleteMany({
      where: { documentId },
    })

    const dimension = config.rag.embeddingDimension

    for (const chunk of chunks) {
      const embeddingResult = await this.embeddingClient.generateEmbedding(chunk.content)
      
      await this.prisma.$executeRaw`
        INSERT INTO document_chunks (id, "documentId", "healthRecordId", content, "chunkIndex", embedding, "tokenCount", metadata, "createdAt")
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

    this.hasKnowledgeBase = true
    this.lastStatsCheck = Date.now()

    return documentId
  }

  async searchSimilar(params: {
    query: string
    category?: string
    healthRecordId?: string
    topK?: number
    mergeChunks?: boolean
  }): Promise<RAGContext[]> {
    if (!this.isReady) {
      await this.initialize()
    }

    const hasKB = await this.checkKnowledgeBaseExists()
    if (!hasKB) {
      return []
    }

    const queryEmbedding = await this.embeddingClient.generateEmbedding(params.query)
    const topK = params.topK || this.rerankTopK
    const dimension = config.rag.embeddingDimension

    let whereClause = '1=1'
    const queryParams: unknown[] = [
      `[${queryEmbedding.embedding.join(',')}]`,
      topK * 2,
    ]

    if (params.category) {
      whereClause += ` AND kd.category = $${queryParams.length + 1}`
      queryParams.push(params.category)
    }

    if (params.healthRecordId) {
      whereClause += ` AND dc."healthRecordId" = $${queryParams.length + 1}`
      queryParams.push(params.healthRecordId)
    }

    const sql = `
      SELECT 
        dc.content,
        dc."documentId",
        dc."chunkIndex",
        kd.source,
        kd.title,
        1 - (dc.embedding <=> $1::vector(${dimension})) as score,
        dc.metadata
      FROM document_chunks dc
      JOIN knowledge_documents kd ON dc."documentId" = kd.id
      WHERE ${whereClause}
      ORDER BY dc.embedding <=> $1::vector(${dimension})
      LIMIT $2
    `

    const results = await this.prisma.$queryRawUnsafe<any[]>(
      sql,
      ...queryParams
    )

    if (params.mergeChunks === false) {
      return results.map(r => ({
        content: r.content,
        source: r.source,
        score: Number(r.score),
        metadata: r.metadata as Record<string, unknown>,
      }))
    }

    const mergedResults = this.mergeAdjacentChunks(results)
    
    return mergedResults.slice(0, params.topK || this.topK)
  }

  private mergeAdjacentChunks(results: RAGSearchResult[]): RAGContext[] {
    if (results.length === 0) return []

    const documentGroups = new Map<string, Map<number, RAGSearchResult[]>>()
    
    for (const r of results) {
      const docId = r.documentId || 'unknown'
      const chunkIndex = r.chunkIndex ?? 0
      
      if (!documentGroups.has(docId)) {
        documentGroups.set(docId, new Map())
      }
      const docChunks = documentGroups.get(docId)!
      
      if (!docChunks.has(chunkIndex)) {
        docChunks.set(chunkIndex, [])
      }
      docChunks.get(chunkIndex)!.push(r)
    }

    const merged: RAGContext[] = []

    for (const [docId, chunkMap] of documentGroups) {
      const sortedIndexes = Array.from(chunkMap.keys()).sort((a, b) => a - b)
      
      let currentContent = ''
      let currentScore = 0
      let source = ''
      let metadata: Record<string, unknown> = {}
      let startIndex = -1

      for (const chunkIndex of sortedIndexes) {
        const chunks = chunkMap.get(chunkIndex)!
        const bestChunk = chunks.reduce((best, curr) => 
          Number(curr.score) > Number(best.score) ? curr : best
        )
        
        if (source === '') {
          source = bestChunk.source
          metadata = bestChunk.metadata || {}
        }

        if (startIndex === -1) {
          startIndex = chunkIndex
          currentContent = bestChunk.content
          currentScore = Number(bestChunk.score)
        } else if (chunkIndex === startIndex + 1 || chunkIndex === sortedIndexes[sortedIndexes.indexOf(chunkIndex) - 1]) {
          if (!currentContent.includes(bestChunk.content)) {
            currentContent += ' ' + bestChunk.content
          }
          currentScore = Math.max(currentScore, Number(bestChunk.score))
          startIndex = chunkIndex
        } else {
          merged.push({
            content: currentContent,
            source,
            score: currentScore,
            metadata: { ...metadata, mergedChunks: sortedIndexes.length },
          })
          
          currentContent = bestChunk.content
          currentScore = Number(bestChunk.score)
          startIndex = chunkIndex
        }
      }

      if (currentContent !== '') {
        merged.push({
          content: currentContent,
          source,
          score: currentScore,
          metadata: { ...metadata, mergedChunks: sortedIndexes.length },
        })
      }
    }

    merged.sort((a, b) => b.score - a.score)
    
    console.log(`[RAG] Merged ${results.length} chunks into ${merged.length} results`)
    
    return merged
  }

  async searchKeyword(params: {
    query: string
    category?: string
    healthRecordId?: string
    topK?: number
  }): Promise<RAGContext[]> {
    if (!this.isReady) {
      await this.initialize()
    }

    const hasKB = await this.checkKnowledgeBaseExists()
    if (!hasKB) {
      return []
    }

    const topK = params.topK || this.rerankTopK
    const searchTerms = params.query
      .split(/[\s，。！？、；：]+/)
      .filter(w => w.length >= 2)
      .map(w => w.toLowerCase())
      .slice(0, 10)

    if (searchTerms.length === 0) {
      return []
    }

    let whereClause = '1=1'
    const queryParams: unknown[] = [topK]

    for (const term of searchTerms) {
      whereClause += ` AND LOWER(dc.content) LIKE $${queryParams.length + 1}`
      queryParams.push(`%${term}%`)
    }

    if (params.category) {
      whereClause += ` AND kd.category = $${queryParams.length + 1}`
      queryParams.push(params.category)
    }

    if (params.healthRecordId) {
      whereClause += ` AND dc."healthRecordId" = $${queryParams.length + 1}`
      queryParams.push(params.healthRecordId)
    }

    const sql = `
      SELECT 
        dc.content,
        kd.source,
        kd.title,
        0.5 as score,
        dc.metadata
      FROM document_chunks dc
      JOIN knowledge_documents kd ON dc."documentId" = kd.id
      WHERE ${whereClause}
      LIMIT $1
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

    for (const r of vectorResults) {
      const key = r.content.substring(0, 100)
      mergedMap.set(key, {
        content: r.content,
        source: r.source,
        score: r.score,
        vectorScore: r.score,
        keywordScore: 0,
        metadata: r.metadata,
      })
    }

    for (const r of keywordResults) {
      const key = r.content.substring(0, 100)
      const existing = mergedMap.get(key)
      if (existing) {
        existing.keywordScore = r.score
        existing.score = existing.vectorScore * vectorWeight + r.score * (1 - vectorWeight)
      } else {
        mergedMap.set(key, {
          content: r.content,
          source: r.source,
          score: r.score * (1 - vectorWeight),
          vectorScore: 0,
          keywordScore: r.score,
          metadata: r.metadata,
        })
      }
    }

    const merged = Array.from(mergedMap.values())
    merged.sort((a, b) => b.score - a.score)

    console.log(`[RAG] Hybrid search: vector=${vectorResults.length}, keyword=${keywordResults.length}, merged=${merged.length}`)
    console.log(`[RAG] Top scores: ${merged.slice(0, 3).map(r => r.score.toFixed(3)).join(', ')}`)

    return merged.slice(0, params.topK || this.topK)
  }

  async searchWithRerank(params: {
    query: string
    category?: string
    healthRecordId?: string
    topK?: number
    useHybrid?: boolean
  }): Promise<RAGContext[]> {
    const hasKB = await this.checkKnowledgeBaseExists()
    if (!hasKB) {
      return []
    }

    const initialResults = params.useHybrid !== false
      ? await this.searchHybrid({
          ...params,
          topK: this.rerankTopK,
          vectorWeight: 0.7,
        })
      : await this.searchSimilar({
          ...params,
          topK: this.rerankTopK,
        })

    if (initialResults.length === 0) {
      return []
    }

    const filteredResults = initialResults.filter(r => r.score >= this.similarityThreshold)

    if (filteredResults.length === 0) {
      console.log('[RAG] All results filtered by threshold, returning top results anyway')
      return initialResults.slice(0, params.topK || this.topK)
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

    this.hasKnowledgeBase = null
    this.lastStatsCheck = 0
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

    this.hasKnowledgeBase = chunkCount > 0
    this.lastStatsCheck = Date.now()

    return {
      totalDocuments: docCount,
      totalChunks: chunkCount,
      categories: categories.map(c => c.category),
    }
  }
}
