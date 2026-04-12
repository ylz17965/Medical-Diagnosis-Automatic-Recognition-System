import { config } from '../config/index.js'

export interface RerankResult {
  index: number
  relevanceScore: number
}

export interface RerankDocument {
  content: string
  source?: string
  metadata?: Record<string, unknown>
}

export class RerankerService {
  private apiKey: string | undefined
  private baseUrl: string
  private model: string

  constructor() {
    this.apiKey = config.qwen.apiKey
    this.baseUrl = 'https://dashscope.aliyuncs.com/api/v1/services/rerank/text-rerank/text-rerank'
    this.model = config.qwen.models.rerank
  }

  async rerank(query: string, documents: RerankDocument[], topN?: number): Promise<RerankResult[]> {
    if (!this.apiKey) {
      console.warn('[Reranker] QWEN_API_KEY not configured, using fallback ranking')
      return documents.map((_, index) => ({ index, relevanceScore: 1 - index * 0.1 }))
    }

    if (documents.length === 0) {
      return []
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: {
            query,
            documents: documents.map(d => d.content),
          },
          parameters: {
            top_n: topN || documents.length,
            return_documents: false,
          },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Reranker] API failed:', response.status, errorText)
        return documents.map((_, index) => ({ index, relevanceScore: 1 - index * 0.1 }))
      }

      const data = await response.json()
      
      if (data.output?.results) {
        console.log('[Reranker] Rerank success, results:', data.output.results.length)
        return data.output.results.map((r: { index: number; relevance_score: number }) => ({
          index: r.index,
          relevanceScore: r.relevance_score,
        }))
      }

      return documents.map((_, index) => ({ index, relevanceScore: 1 - index * 0.1 }))
    } catch (error) {
      console.error('[Reranker] Error:', error)
      return documents.map((_, index) => ({ index, relevanceScore: 1 - index * 0.1 }))
    }
  }

  async rerankWithDocuments<T extends RerankDocument>(
    query: string,
    documents: T[],
    topN?: number
  ): Promise<T[]> {
    if (documents.length === 0) {
      return []
    }

    const rerankResults = await this.rerank(query, documents, topN)
    
    return rerankResults
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, topN || documents.length)
      .map(result => documents[result.index])
  }
}
