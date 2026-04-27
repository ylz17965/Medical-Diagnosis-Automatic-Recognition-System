interface Citation {
  id: string
  content: string
  context: string
  relevanceScore: number
}

interface Literature {
  id: string
  type: 'consensus' | 'guideline' | 'textbook' | 'journal'
  title: string
  authors: string[]
  journal?: string
  publisher?: string
  year: number
  volume?: string
  issue?: string
  impactFactor: number | null
  doi?: string
  link?: string
  keywords: string[]
  abstract: string
  citations: Citation[]
}

interface SearchResult {
  literature: Literature
  matchedCitations: Citation[]
  maxScore: number
}

interface DeepSearchResult {
  query: string
  citations: Array<{
    id: string
    title: string
    authors: string
    journal: string
    year: number
    type: string
    typeLabel: string
    citationContent: string
    citationContext?: string
    relevanceScore: number
    impactFactor: number | null
  }>
}

class LiteratureService {
  search(query: string, maxResults: number = 3): DeepSearchResult {
    // 文献数据库已移除，引用数据现在来自RAG数据库
    // 返回空结果，由RAG服务提供文献引用
    return {
      query,
      citations: []
    }
  }

  deepSearch(query: string, maxResults: number = 5): DeepSearchResult {
    return this.search(query, maxResults)
  }

  getTopLiterature(maxResults: number = 3): Array<{
    title: string
    authors: string
    journal: string
    year: number
    impactFactor: number | null
  }> {
    return []
  }
}

export const literatureService = new LiteratureService()
export type { DeepSearchResult, Literature, Citation }
