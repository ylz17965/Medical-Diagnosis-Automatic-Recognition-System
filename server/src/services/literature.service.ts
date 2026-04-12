import literatureDatabase from '../data/literature_database.json' with { type: 'json' }

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
  relevanceScore: number
  matchType: 'keyword' | 'semantic' | 'exact'
}

interface FormattedCitation {
  id: string
  type: string
  typeLabel: string
  title: string
  authors: string
  journal: string
  year: number
  volume?: string
  issue?: string
  impactFactor: number | null
  doi?: string
  link?: string
  citationContent: string
  citationContext: string
  relevanceScore: number
}

interface DeepSearchResult {
  totalSearched: number
  totalCited: number
  citations: FormattedCitation[]
  searchSummary: string
}

const TYPE_LABELS: Record<string, string> = {
  consensus: '专家共识',
  guideline: '指南',
  textbook: '教材',
  journal: '期刊论文'
}

class LiteratureService {
  private literature: Literature[] = []
  private keywordIndex: Map<string, Set<string>> = new Map()

  constructor() {
    this.literature = literatureDatabase.literature as Literature[]
    this.buildKeywordIndex()
  }

  private buildKeywordIndex(): void {
    for (const lit of this.literature) {
      for (const keyword of lit.keywords) {
        const normalizedKeyword = keyword.toLowerCase()
        if (!this.keywordIndex.has(normalizedKeyword)) {
          this.keywordIndex.set(normalizedKeyword, new Set())
        }
        this.keywordIndex.get(normalizedKeyword)!.add(lit.id)
      }

      for (const citation of lit.citations) {
        const words = citation.content.split(/[，。、；：！？""''（）\s]+/)
        for (const word of words) {
          if (word.length >= 2) {
            const normalizedWord = word.toLowerCase()
            if (!this.keywordIndex.has(normalizedWord)) {
              this.keywordIndex.set(normalizedWord, new Set())
            }
            this.keywordIndex.get(normalizedWord)!.add(lit.id)
          }
        }
      }
    }
  }

  search(query: string, maxResults: number = 10): SearchResult[] {
    const queryWords = this.tokenize(query)
    console.log('[LiteratureService] Search query:', query)
    console.log('[LiteratureService] Tokenized words:', queryWords)
    
    const literatureScores: Map<string, { score: number; matchedCitations: Set<string> }> = new Map()

    for (const word of queryWords) {
      if (word.length < 2) continue
      
      const normalizedWord = word.toLowerCase()
      
      for (const lit of this.literature) {
        let wordScore = 0
        let matched = false
        
        for (const keyword of lit.keywords) {
          const normalizedKeyword = keyword.toLowerCase()
          if (normalizedKeyword.includes(normalizedWord) || 
              normalizedWord.includes(normalizedKeyword) ||
              this.partialMatch(normalizedWord, normalizedKeyword)) {
            wordScore = Math.max(wordScore, 3)
            matched = true
          }
        }
        
        for (const citation of lit.citations) {
          const citationLower = citation.content.toLowerCase()
          if (citationLower.includes(normalizedWord) || 
              this.partialMatch(normalizedWord, citationLower)) {
            wordScore = Math.max(wordScore, 2)
            matched = true
          }
        }
        
        const titleLower = lit.title.toLowerCase()
        if (titleLower.includes(normalizedWord) || 
            this.partialMatch(normalizedWord, titleLower)) {
          wordScore = Math.max(wordScore, 2)
          matched = true
        }
        
        if (matched) {
          if (!literatureScores.has(lit.id)) {
            literatureScores.set(lit.id, { score: 0, matchedCitations: new Set() })
          }
          const current = literatureScores.get(lit.id)!
          current.score += wordScore
        }
      }
    }
    
    console.log(`[LiteratureService] Total literature matched: ${literatureScores.size}`)

    const results: SearchResult[] = []
    for (const [litId, data] of literatureScores) {
      const lit = this.literature.find(l => l.id === litId)
      if (lit) {
        const matchedCitations = this.findMatchingCitations(lit, queryWords)
        results.push({
          literature: lit,
          matchedCitations,
          relevanceScore: data.score / queryWords.length,
          matchType: 'keyword'
        })
      }
    }

    results.sort((a, b) => {
      const scoreCompare = b.relevanceScore - a.relevanceScore
      if (scoreCompare !== 0) return scoreCompare
      const aIF = a.literature.impactFactor || 1
      const bIF = b.literature.impactFactor || 0
      return bIF - aIF
    })

    const filteredResults = results.filter(r => r.relevanceScore >= 0.5)
    return filteredResults.slice(0, maxResults)
  }

  private tokenize(text: string): string[] {
    const stopWords = new Set(['的', '了', '是', '在', '有', '和', '与', '或', '我', '你', '他', '她', '它', '这', '那', '什么', '怎么', '如何', '为什么', '吗', '呢', '啊', '吧', '呀'])
    
    const words: string[] = []
    const segments = text.split(/[\s，。！？、；：""''（）【】《》]+/)
    
    for (const segment of segments) {
      if (segment.length === 0) continue
      
      if (!stopWords.has(segment)) {
        words.push(segment)
      }
      
      for (let i = 0; i < segment.length - 1; i++) {
        const bigram = segment.substring(i, i + 2)
        if (!stopWords.has(bigram)) {
          words.push(bigram)
        }
      }
    }

    return [...new Set(words)]
  }

  private partialMatch(query: string, target: string): boolean {
    if (query.length < 2 || target.length < 2) return false
    
    for (let i = 0; i <= query.length - 2; i++) {
      const bigram = query.substring(i, i + 2)
      if (target.includes(bigram)) {
        return true
      }
    }
    
    for (let i = 0; i <= target.length - 2; i++) {
      const bigram = target.substring(i, i + 2)
      if (query.includes(bigram)) {
        return true
      }
    }
    
    return false
  }

  private findMatchingCitations(literature: Literature, queryWords: string[]): Citation[] {
    const scoredCitations: { citation: Citation; score: number }[] = []

    for (const citation of literature.citations) {
      let score = citation.relevanceScore
      const citationLower = citation.content.toLowerCase()
      const contextLower = citation.context.toLowerCase()

      for (const word of queryWords) {
        const wordLower = word.toLowerCase()
        if (citationLower.includes(wordLower)) {
          score += 0.3
        }
        if (contextLower.includes(wordLower)) {
          score += 0.2
        }
      }

      scoredCitations.push({ citation, score })
    }

    scoredCitations.sort((a, b) => b.score - a.score)
    return scoredCitations.slice(0, 3).map(s => s.citation)
  }

  deepSearch(query: string, maxCitations: number = 12): DeepSearchResult {
    console.log('[LiteratureService] deepSearch called with query:', query)
    const results = this.search(query, 20)
    console.log('[LiteratureService] deepSearch found', results.length, 'results')
    
    const allCitations: FormattedCitation[] = []
    let citedCount = 0

    for (const result of results) {
      for (const citation of result.matchedCitations) {
        if (allCitations.length >= maxCitations) break

        const doi = result.literature.doi
        const link = result.literature.link || (doi ? `https://doi.org/${doi}` : undefined)

        allCitations.push({
          id: citation.id,
          type: result.literature.type,
          typeLabel: TYPE_LABELS[result.literature.type] || result.literature.type,
          title: result.literature.title,
          authors: result.literature.authors.join('、'),
          journal: result.literature.journal || result.literature.publisher || '',
          year: result.literature.year,
          volume: result.literature.volume,
          issue: result.literature.issue,
          impactFactor: result.literature.impactFactor,
          doi,
          link,
          citationContent: citation.content,
          citationContext: citation.context,
          relevanceScore: citation.relevanceScore
        })
        citedCount++
      }
      if (allCitations.length >= maxCitations) break
    }

    const searchSummary = this.generateSearchSummary(query, results.length, citedCount)

    return {
      totalSearched: results.length,
      totalCited: citedCount,
      citations: allCitations,
      searchSummary
    }
  }

  private generateSearchSummary(query: string, totalSearched: number, totalCited: number): string {
    return `总计检索 ${totalSearched} 篇专业文献，引用 ${totalCited} 篇`
  }

  formatCitationsForDisplay(citations: FormattedCitation[]): string {
    if (citations.length === 0) return ''

    const lines: string[] = ['\n\n---\n**📚 引用资料**\n']
    
    for (let i = 0; i < citations.length; i++) {
      const c = citations[i]
      const ifText = c.impactFactor ? ` (IF: ${c.impactFactor})` : ''
      const linkText = c.link ? `\n   🔗 [查看原文](${c.link})` : ''
      
      lines.push(`\n**[${i + 1}] [${c.typeLabel}] ${c.title}**${ifText}`)
      lines.push(`   📝 ${c.authors}`)
      lines.push(`   📖 ${c.journal}, ${c.year}${c.volume ? `, ${c.volume}卷` : ''}${c.issue ? `(${c.issue}期)` : ''}`)
      if (c.doi) {
        lines.push(`   🔗 DOI: [${c.doi}](https://doi.org/${c.doi})`)
      }
      lines.push(`   📌 **引用内容**: ${c.citationContent}`)
      lines.push(`   📋 **引用上下文**: ${c.citationContext}`)
      lines.push('')
    }

    return lines.join('\n')
  }

  formatCitationsInline(citations: FormattedCitation[]): string {
    if (citations.length === 0) return ''

    const refNumbers = citations.map((_, i) => `[${i + 1}]`).join('')
    return refNumbers
  }

  getCitationById(citationId: string): FormattedCitation | null {
    for (const lit of this.literature) {
      const citation = lit.citations.find(c => c.id === citationId)
      if (citation) {
        const link = lit.doi ? `https://doi.org/${lit.doi}` : undefined
        return {
          id: citation.id,
          type: lit.type,
          typeLabel: TYPE_LABELS[lit.type] || lit.type,
          title: lit.title,
          authors: lit.authors.join('、'),
          journal: lit.journal || lit.publisher || '',
          year: lit.year,
          impactFactor: lit.impactFactor,
          doi: lit.doi,
          link,
          citationContent: citation.content,
          citationContext: citation.context,
          relevanceScore: citation.relevanceScore
        }
      }
    }
    return null
  }

  getLiteratureById(literatureId: string): Literature | null {
    return this.literature.find(l => l.id === literatureId) || null
  }

  getAllLiterature(): Literature[] {
    return [...this.literature]
  }

  getStatistics(): { totalLiterature: number; totalCitations: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {}
    let totalCitations = 0

    for (const lit of this.literature) {
      byType[lit.type] = (byType[lit.type] || 0) + 1
      totalCitations += lit.citations.length
    }

    return {
      totalLiterature: this.literature.length,
      totalCitations,
      byType
    }
  }
}

export const literatureService = new LiteratureService()
export type { Literature, Citation, SearchResult, FormattedCitation, DeepSearchResult }
