import type { HybridSearchResult, GraphContext } from './hybrid-search.service.js'

export interface SourceReference {
  id: string
  type: 'vector' | 'knowledge_graph'
  source: string
  content: string
  relevanceScore: number
  confidence: number
  highlight?: string
  metadata?: Record<string, unknown>
}

export interface ReasoningStep {
  step: number
  type: 'retrieval' | 'inference' | 'verification'
  description: string
  sources: SourceReference[]
  confidence: number
  details?: string
}

export interface ExplanationResult {
  query: string
  summary: string
  sources: SourceReference[]
  reasoningChain: ReasoningStep[]
  overallConfidence: number
  limitations: string[]
  suggestions: string[]
}

export interface ConfidenceFactors {
  sourceReliability: number
  relevanceScore: number
  coverageScore: number
  consistencyScore: number
  recencyScore: number
}

export class ExplainableRAGService {
  private readonly sourceReliabilityMap: Record<string, number> = {
    '知识图谱: Disease': 0.95,
    '知识图谱: Drug': 0.95,
    '知识图谱: Symptom': 0.90,
    '知识图谱: Examination': 0.90,
    '知识图谱: Department': 0.85,
    '医学教材': 0.90,
    '临床指南': 0.95,
    '医学论文': 0.80,
    '健康网站': 0.70,
    'general': 0.60
  }

  generateExplanation(
    query: string,
    searchResults: HybridSearchResult[],
    response?: string
  ): ExplanationResult {
    const sources = this.buildSourceReferences(searchResults)
    const reasoningChain = this.buildReasoningChain(query, searchResults)
    const overallConfidence = this.calculateOverallConfidence(sources)
    const limitations = this.identifyLimitations(searchResults, overallConfidence)
    const suggestions = this.generateSuggestions(query, searchResults, overallConfidence)

    return {
      query,
      summary: this.generateSummary(query, sources, response),
      sources,
      reasoningChain,
      overallConfidence,
      limitations,
      suggestions
    }
  }

  private buildSourceReferences(results: HybridSearchResult[]): SourceReference[] {
    return results.map((result, index) => {
      const sourceType = result.source.includes('知识图谱') ? 'knowledge_graph' : 'vector'
      const reliability = this.getSourceReliability(result.source)
      const confidence = this.calculateSourceConfidence(result, reliability)

      return {
        id: `src_${index + 1}`,
        type: sourceType,
        source: result.source,
        content: this.truncateContent(result.content, 200),
        relevanceScore: result.score,
        confidence,
        highlight: this.extractHighlight(result.content, result.graphContext),
        metadata: result.metadata || result.graphContext as unknown as Record<string, unknown>
      }
    })
  }

  private calculateSourceConfidence(
    result: HybridSearchResult,
    reliability: number
  ): number {
    const relevanceWeight = 0.4
    const reliabilityWeight = 0.3
    const coverageWeight = 0.3

    const relevanceScore = Math.min(result.score, 1)
    const coverageScore = result.content.length > 100 ? 1 : result.content.length / 100

    return (
      relevanceScore * relevanceWeight +
      reliability * reliabilityWeight +
      coverageScore * coverageWeight
    )
  }

  private getSourceReliability(source: string): number {
    for (const [key, value] of Object.entries(this.sourceReliabilityMap)) {
      if (source.includes(key)) {
        return value
      }
    }
    return this.sourceReliabilityMap.general
  }

  private buildReasoningChain(
    query: string,
    results: HybridSearchResult[]
  ): ReasoningStep[] {
    const steps: ReasoningStep[] = []

    steps.push({
      step: 1,
      type: 'retrieval',
      description: '检索相关知识源',
      sources: [],
      confidence: results.length > 0 ? 0.9 : 0.3,
      details: `从向量数据库和知识图谱中检索到 ${results.length} 条相关信息`
    })

    const vectorResults = results.filter(r => r.type === 'vector')
    const kgResults = results.filter(r => r.type === 'knowledge_graph')

    if (kgResults.length > 0) {
      steps.push({
        step: 2,
        type: 'inference',
        description: '知识图谱推理',
        sources: kgResults.map((r, i) => ({
          id: `kg_${i + 1}`,
          type: 'knowledge_graph' as const,
          source: r.source,
          content: this.truncateContent(r.content, 100),
          relevanceScore: r.score,
          confidence: 0.9
        })),
        confidence: 0.85,
        details: `通过知识图谱发现 ${kgResults.length} 个相关实体及其关联关系`
      })
    }

    if (vectorResults.length > 0) {
      steps.push({
        step: kgResults.length > 0 ? 3 : 2,
        type: 'inference',
        description: '语义匹配分析',
        sources: vectorResults.map((r, i) => ({
          id: `vec_${i + 1}`,
          type: 'vector' as const,
          source: r.source,
          content: this.truncateContent(r.content, 100),
          relevanceScore: r.score,
          confidence: r.score
        })),
        confidence: vectorResults.reduce((sum, r) => sum + r.score, 0) / vectorResults.length,
        details: `通过向量相似度匹配到 ${vectorResults.length} 条相关文档`
      })
    }

    steps.push({
      step: steps.length + 1,
      type: 'verification',
      description: '信息交叉验证',
      sources: [],
      confidence: this.calculateCrossValidationScore(results),
      details: this.generateVerificationDetails(results)
    })

    return steps
  }

  private calculateCrossValidationScore(results: HybridSearchResult[]): number {
    if (results.length < 2) return 0.5

    const vectorTypes = new Set(
      results.filter(r => r.type === 'vector').map(r => r.source)
    )
    const kgTypes = new Set(
      results.filter(r => r.type === 'knowledge_graph').map(r => r.graphContext?.entityType)
    )

    const hasMultipleSources = vectorTypes.size > 0 && kgTypes.size > 0
    const hasMultipleTypes = vectorTypes.size + kgTypes.size > 2

    if (hasMultipleSources && hasMultipleTypes) return 0.9
    if (hasMultipleSources || hasMultipleTypes) return 0.75
    return 0.6
  }

  private generateVerificationDetails(results: HybridSearchResult[]): string {
    const vectorCount = results.filter(r => r.type === 'vector').length
    const kgCount = results.filter(r => r.type === 'knowledge_graph').length

    if (vectorCount > 0 && kgCount > 0) {
      return `向量检索和知识图谱结果相互印证，提高了答案的可信度`
    }
    if (kgCount > 0) {
      return `知识图谱提供了结构化的医学知识支持`
    }
    if (vectorCount > 0) {
      return `基于语义相似度检索的相关文档`
    }
    return `信息来源有限，建议进一步验证`
  }

  private calculateOverallConfidence(sources: SourceReference[]): number {
    if (sources.length === 0) return 0.2

    const avgConfidence = sources.reduce((sum, s) => sum + s.confidence, 0) / sources.length
    const maxConfidence = Math.max(...sources.map(s => s.confidence))
    const sourceDiversity = Math.min(sources.length / 5, 1)

    return avgConfidence * 0.5 + maxConfidence * 0.3 + sourceDiversity * 0.2
  }

  private identifyLimitations(
    results: HybridSearchResult[],
    confidence: number
  ): string[] {
    const limitations: string[] = []

    if (results.length < 3) {
      limitations.push('检索到的相关资料较少，答案可能不够全面')
    }

    if (confidence < 0.6) {
      limitations.push('整体置信度较低，建议咨询专业医生')
    }

    const hasKG = results.some(r => r.type === 'knowledge_graph')
    if (!hasKG) {
      limitations.push('未找到知识图谱支持，可能缺少权威医学知识')
    }

    const hasVector = results.some(r => r.type === 'vector')
    if (!hasVector) {
      limitations.push('未找到相关文档资料')
    }

    limitations.push('本回答仅供参考，不能替代专业医疗诊断')

    return limitations
  }

  private generateSuggestions(
    query: string,
    results: HybridSearchResult[],
    confidence: number
  ): string[] {
    const suggestions: string[] = []

    if (confidence < 0.7) {
      suggestions.push('建议提供更详细的症状描述以获得更准确的答案')
    }

    const symptoms = this.extractSymptoms(query)
    if (symptoms.length > 0) {
      suggestions.push('如症状持续或加重，建议及时就医')
    }

    const hasDrugQuery = query.includes('药') || query.includes('治疗')
    if (hasDrugQuery) {
      suggestions.push('用药前请仔细阅读说明书，必要时咨询医生或药师')
    }

    suggestions.push('如有紧急情况，请立即拨打急救电话或前往医院')

    return suggestions
  }

  private extractSymptoms(query: string): string[] {
    const symptomKeywords = [
      '头痛', '发热', '咳嗽', '腹痛', '恶心', '呕吐', '腹泻',
      '头晕', '乏力', '失眠', '胸闷', '心悸', '皮疹', '瘙痒'
    ]
    return symptomKeywords.filter(s => query.includes(s))
  }

  private generateSummary(
    query: string,
    sources: SourceReference[],
    response?: string
  ): string {
    const topSources = sources.slice(0, 3)
    const sourceTypes = [...new Set(topSources.map(s => s.type))]

    let summary = `针对"${query}"的查询，`
    summary += `共检索到 ${sources.length} 条相关信息。`
    summary += `信息来源包括：${sourceTypes.map(t => t === 'knowledge_graph' ? '知识图谱' : '文档资料').join('、')}。`

    if (sources.length > 0) {
      const avgConfidence = sources.reduce((sum, s) => sum + s.confidence, 0) / sources.length
      summary += `平均置信度：${(avgConfidence * 100).toFixed(0)}%。`
    }

    return summary
  }

  private extractHighlight(
    content: string,
    graphContext?: GraphContext
  ): string {
    if (graphContext) {
      const relations = graphContext.relations.slice(0, 3)
      return relations.map(r => `${r.type}: ${r.targetName}`).join('；')
    }

    const sentences = content.split(/[。\n]/).filter(s => s.trim())
    if (sentences.length > 0) {
      return sentences[0].trim().slice(0, 100)
    }

    return content.slice(0, 100)
  }

  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content
    return content.slice(0, maxLength) + '...'
  }

  formatExplanationForDisplay(explanation: ExplanationResult): string {
    let output = `## 回答说明\n\n`
    output += `${explanation.summary}\n\n`

    output += `### 信息来源\n\n`
    explanation.sources.forEach((source, i) => {
      output += `${i + 1}. **${source.source}** (置信度: ${(source.confidence * 100).toFixed(0)}%)\n`
      output += `   ${source.content}\n\n`
    })

    output += `### 推理过程\n\n`
    explanation.reasoningChain.forEach(step => {
      output += `${step.step}. ${step.description} (置信度: ${(step.confidence * 100).toFixed(0)}%)\n`
      if (step.details) {
        output += `   ${step.details}\n`
      }
    })

    output += `\n### 注意事项\n\n`
    explanation.limitations.forEach(l => {
      output += `- ${l}\n`
    })

    if (explanation.suggestions.length > 0) {
      output += `\n### 建议\n\n`
      explanation.suggestions.forEach(s => {
        output += `- ${s}\n`
      })
    }

    output += `\n---\n`
    output += `*整体置信度: ${(explanation.overallConfidence * 100).toFixed(0)}%*`

    return output
  }
}
