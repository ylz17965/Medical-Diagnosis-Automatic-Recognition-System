import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RAGService } from '../services/rag.service.js'
import { PrismaClient } from '@prisma/client'

vi.mock('@prisma/client', () => {
  return {
    PrismaClient: vi.fn(() => ({
      documentChunk: {
        count: vi.fn(),
        deleteMany: vi.fn(),
      },
      knowledgeDocument: {
        findUnique: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      $queryRawUnsafe: vi.fn(),
      $executeRaw: vi.fn(),
    })),
  }
})

vi.mock('../services/bge-m3-client.service.js', () => ({
  bgeM3Client: {
    waitForReady: vi.fn().mockResolvedValue(true),
    generateEmbedding: vi.fn().mockResolvedValue({
      embedding: new Array(1024).fill(0.1),
    }),
  },
}))

vi.mock('../services/reranker.service.js', () => ({
  RerankerService: vi.fn(() => ({
    rerankWithDocuments: vi.fn().mockImplementation((query, docs, topK) => {
      return Promise.resolve(docs.slice(0, topK))
    }),
  })),
}))

describe('RAGService', () => {
  let ragService: RAGService
  let mockPrisma: PrismaClient

  beforeEach(() => {
    mockPrisma = new PrismaClient()
    ragService = new RAGService(mockPrisma)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('chunkText', () => {
    it('should split text into chunks by sentence', () => {
      const text = '这是第一句话。这是第二句话。这是第三句话。'
      const chunks = ragService.chunkText(text)

      expect(chunks.length).toBeGreaterThan(0)
      expect(chunks[0]).toHaveProperty('content')
      expect(chunks[0]).toHaveProperty('index')
      expect(chunks[0]).toHaveProperty('tokenCount')
    })

    it('should handle empty text', () => {
      const chunks = ragService.chunkText('')
      expect(chunks).toEqual([])
    })

    it('should respect chunk size', () => {
      const longText = '很长的句子。'.repeat(100)
      const chunks = ragService.chunkText(longText)

      chunks.forEach(chunk => {
        expect(chunk.content.length).toBeLessThanOrEqual(1000)
      })
    })
  })

  describe('chunkTextSemantic', () => {
    it('should identify headers and create separate chunks', () => {
      const text = `一、概述
这是概述内容。

二、详细说明
这是详细说明内容。`

      const chunks = ragService.chunkTextSemantic(text)

      expect(chunks.length).toBeGreaterThan(0)
    })

    it('should preserve section structure', () => {
      const text = `【重要提示】
这是重要提示内容。

【注意事项】
这是注意事项内容。`

      const chunks = ragService.chunkTextSemantic(text)
      expect(chunks.length).toBeGreaterThan(0)
    })
  })

  describe('chunkTextAdaptive', () => {
    it('should use semantic chunking for structured text', () => {
      const structuredText = `一、标题
内容内容。

二、另一个标题
更多内容。`

      const chunks = ragService.chunkTextAdaptive(structuredText)
      expect(chunks.length).toBeGreaterThan(0)
    })

    it('should use simple chunking for unstructured text', () => {
      const unstructuredText = '这是一段普通的文本，没有明显的结构。只是简单的内容。'
      const chunks = ragService.chunkTextAdaptive(unstructuredText)
      expect(chunks.length).toBeGreaterThan(0)
    })
  })

  describe('searchSimilar', () => {
    it('should return empty array when no knowledge base exists', async () => {
      vi.mocked(mockPrisma.documentChunk.count).mockResolvedValue(0)

      const results = await ragService.searchSimilar({
        query: '测试查询',
      })

      expect(results).toEqual([])
    })
  })

  describe('searchKeyword', () => {
    it('should return empty array for short queries', async () => {
      vi.mocked(mockPrisma.documentChunk.count).mockResolvedValue(10)

      const results = await ragService.searchKeyword({
        query: '测',
      })

      expect(results).toEqual([])
    })

    it('should split query into search terms', async () => {
      vi.mocked(mockPrisma.documentChunk.count).mockResolvedValue(10)
      vi.mocked(mockPrisma.$queryRawUnsafe).mockResolvedValue([])

      await ragService.searchKeyword({
        query: '头痛 发热 咳嗽',
      })

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled()
    })
  })

  describe('searchHybrid', () => {
    it('should combine vector and keyword results', async () => {
      vi.mocked(mockPrisma.documentChunk.count).mockResolvedValue(10)
      vi.mocked(mockPrisma.$queryRawUnsafe).mockResolvedValue([
        { content: '测试内容1', source: 'test1', score: 0.9 },
        { content: '测试内容2', source: 'test2', score: 0.8 },
      ])

      const results = await ragService.searchHybrid({
        query: '头痛怎么办',
        vectorWeight: 0.7,
      })

      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('buildContextForQuery', () => {
    it('should return empty string when no results found', async () => {
      vi.mocked(mockPrisma.documentChunk.count).mockResolvedValue(0)

      const context = await ragService.buildContextForQuery({
        query: '测试查询',
      })

      expect(context).toBe('')
    })
  })

  describe('getDocumentStats', () => {
    it('should return document statistics', async () => {
      vi.mocked(mockPrisma.knowledgeDocument.count).mockResolvedValue(10)
      vi.mocked(mockPrisma.documentChunk.count).mockResolvedValue(100)
      vi.mocked(mockPrisma.knowledgeDocument.findMany).mockResolvedValue([
        { category: 'guideline' },
        { category: 'textbook' },
      ])

      const stats = await ragService.getDocumentStats()

      expect(stats.totalDocuments).toBe(10)
      expect(stats.totalChunks).toBe(100)
      expect(stats.categories).toContain('guideline')
      expect(stats.categories).toContain('textbook')
    })
  })
})
