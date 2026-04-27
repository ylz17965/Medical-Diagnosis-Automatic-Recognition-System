import { config } from '../config/index.js'
import { RAGService } from './rag.service.js'
import { credibilityService, type SourceAnnotation } from './credibility.service.js'
import { routeToAgent, getAgentSystemPrompt, loadAgent } from './agent.service.js'
import { literatureService } from './literature.service.js'
import { createLogger } from '../utils/logger.js'

const log = createLogger('llm-service')

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface FormattedCitation {
  id: string
  title: string
  authors: string[]
  journal: string
  year: number
  impactFactor: number | null
  typeLabel: string
  doi?: string
  link?: string
  citationContent: string
  citationContext?: string
}

export interface DeepSearchResult {
  totalSearched: number
  totalCited: number
  citations: FormattedCitation[]
  searchSummary: string
}

export interface ChatCompletionOptions {
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  stream?: boolean
  useRAG?: boolean
  ragCategory?: string
  healthRecordId?: string
  modelType?: 'complex' | 'simple'
  sessionId?: string
  useAgent?: boolean
  userApiKey?: string
  userApiBaseUrl?: string
  userComplexModel?: string
  userSimpleModel?: string
}

export interface StreamChunk {
  content: string
  done: boolean
  sources?: Array<{ source: string; content: string }>
  needsFollowUp?: boolean
  followUpQuestions?: string[]
  isEmergency?: boolean
  citations?: FormattedCitation[]
  deepSearchResult?: DeepSearchResult
  agentUsed?: {
    id: string
    name: string
    emoji: string
  }
}

export class LLMService {
  private apiKey: string | undefined
  private baseUrl: string
  private complexModel: string
  private simpleModel: string
  private ragService: RAGService | null = null

  constructor(ragService?: RAGService) {
    this.apiKey = config.qwen.apiKey
    this.baseUrl = config.qwen.baseUrl
    this.complexModel = config.qwen.models.complex
    this.simpleModel = config.qwen.models.simple
    this.ragService = ragService || null
  }

  private hasApiKey(apiKey?: string): boolean {
    const key = apiKey || this.apiKey
    if (!key || key.length === 0) return false
    if (key.includes('your-') && key.includes('-here')) return false
    if (key.includes('YOUR_') && key.includes('_KEY')) return false
    if (key.includes('api-key')) return false
    return true
  }

  private getEffectiveApiKey(options?: ChatCompletionOptions): string | undefined {
    return options?.userApiKey || this.apiKey
  }

  private getEffectiveBaseUrl(options?: ChatCompletionOptions): string {
    return options?.userApiBaseUrl || this.baseUrl
  }

  private getEffectiveModel(query: string, modelType?: 'complex' | 'simple', options?: ChatCompletionOptions): string {
    if (modelType === 'complex') return options?.userComplexModel || this.complexModel
    if (modelType === 'simple') return options?.userSimpleModel || this.simpleModel
    return this.isComplexQuestion(query) ? (options?.userComplexModel || this.complexModel) : (options?.userSimpleModel || this.simpleModel)
  }

  isComplexQuestion(query: string): boolean {
    const COMPLEX_KEYWORDS = [
      '病理', '机制', '原理', '深度', '详细', '全面', '分析',
      '诊断', '鉴别', '并发症', '预后', '治疗方案',
      '相互作用', '禁忌', '副作用', '不良反应',
      '异常', '偏高', '偏低', '指标', '检验'
    ]
    const lowerQuery = query.toLowerCase()
    return COMPLEX_KEYWORDS.some(keyword => lowerQuery.includes(keyword)) ||
           query.length > 100
  }

  selectModel(query: string, modelType?: 'complex' | 'simple'): string {
    if (modelType === 'complex') return this.complexModel
    if (modelType === 'simple') return this.simpleModel
    return this.isComplexQuestion(query) ? this.complexModel : this.simpleModel
  }

  getSystemPrompt(type?: 'CHAT' | 'SEARCH' | 'REPORT' | 'DRUG'): string {
    const basePrompt = credibilityService.getSystemPrompt()
    
    const typeSpecificInstructions: Record<string, string> = {
      REPORT: `

## 体检报告解读专项规则
1. 解读体检报告中的各项指标
2. 解释指标的含义和正常范围
3. 分析异常指标可能的原因
4. 提供生活建议和就医建议
5. 每项指标解读需标注参考来源`,
      DRUG: `

## 用药指导专项规则
1. 提供药品的基本信息（名称、成分、适应症）
2. 解释用法用量
3. 说明注意事项和禁忌症
4. 提供可能的副作用信息
5. 用药建议必须标注来源指南或说明书
6. 必须确认用户无过敏史后再给出建议`
    }

    return basePrompt + (typeSpecificInstructions[type || 'CHAT'] || '')
  }

  getAgentSystemPrompt(userMessage: string): { prompt: string; agentInfo?: { id: string; name: string; emoji: string } } {
    const routeResult = routeToAgent(userMessage)
    const agent = loadAgent(routeResult.agentId)
    
    if (agent) {
      const agentPrompt = getAgentSystemPrompt(routeResult.agentId)
      const basePrompt = credibilityService.getSystemPrompt()
      
      return {
        prompt: basePrompt + '\n\n' + agentPrompt,
        agentInfo: {
          id: routeResult.agentId,
          name: agent.name,
          emoji: agent.emoji
        }
      }
    }
    
    return { prompt: this.getSystemPrompt('CHAT') }
  }

  async chat(options: ChatCompletionOptions): Promise<string> {
    const effectiveApiKey = this.getEffectiveApiKey(options)
    if (!this.hasApiKey(effectiveApiKey)) {
      return this.getDemoResponse()
    }

    const sessionId = options.sessionId || `session_${Date.now()}`
    const conversationType = options.ragCategory === 'medical_report' ? 'REPORT' :
                            options.ragCategory === 'drug_info' ? 'DRUG' : 'CHAT'
    
    const lastUserMessage = options.messages.filter(m => m.role === 'user').pop()
    const userInput = lastUserMessage?.content || ''

    const enhancedPrompt = credibilityService.buildEnhancedPrompt(userInput, sessionId)

    if (enhancedPrompt.isEmergency) {
      return enhancedPrompt.emergencyWarning + '\n\n' + credibilityService.getDisclaimer()
    }

    let systemPrompt: string
    if (options.useAgent !== false && userInput) {
      const agentResult = this.getAgentSystemPrompt(userInput)
      systemPrompt = agentResult.prompt
    } else {
      systemPrompt = this.getSystemPrompt(conversationType)
    }

    const messages: ChatMessage[] = [{ 
      role: 'system', 
      content: systemPrompt
    }]

    const model = this.getEffectiveModel(userInput, options.modelType, options)
    const baseUrl = this.getEffectiveBaseUrl(options)

    let ragResults: any[] = []
    let literatureResult: any = undefined

    if (options.useRAG && this.ragService && lastUserMessage) {
      const ragPromise = this.ragService.searchWithRerank({
        query: lastUserMessage.content,
        category: options.ragCategory,
        healthRecordId: options.healthRecordId,
      }).catch((error) => {
        log.error({ error }, 'RAG search error')
        return []
      })

      const litPromise = new Promise<any>((resolve) => {
        try {
          if (userInput && userInput.length > 0) {
            resolve(literatureService.deepSearch(userInput, 5))
          } else {
            resolve(undefined)
          }
        } catch (error) {
          log.error({ error }, 'Literature search error')
          resolve(undefined)
        }
      })

      const [ragRes, litRes] = await Promise.all([ragPromise, litPromise])
      ragResults = ragRes
      literatureResult = litRes
    } else {
      try {
        if (userInput && userInput.length > 0) {
          literatureResult = literatureService.deepSearch(userInput, 5)
        }
      } catch (error) {
        log.error({ error }, 'Literature search error')
      }
    }

    const combinedContext: string[] = []

    if (literatureResult && literatureResult.citations && literatureResult.citations.length > 0) {
      const literatureContext = literatureResult.citations.slice(0, 3).map((c: any, i: number) => {
        const refNum = i + 1
        return `[${refNum}] ${c.title} (${c.journal}, ${c.year}) - ${c.citationContent}`
      }).join('\n')
      combinedContext.push(literatureContext)
    }

    if (ragResults.length > 0) {
      const ragContext = ragResults.slice(0, 3).map((r, i) => {
        const refNum = (Math.min(literatureResult?.citations?.length || 0, 3)) + i + 1
        return `[${refNum}] ${r.content.substring(0, 200)}`
      }).join('\n')
      combinedContext.push(ragContext)
    }

    if (combinedContext.length > 0) {
      const fullContext = combinedContext.join('\n')
      messages.push({
        role: 'system',
        content: `参考资料（回答时标注引用编号[1][2]）:\n${fullContext}`,
      })
    }

    messages.push(...options.messages)

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${effectiveApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: false,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`LLM request failed: ${response.status} ${error}`)
    }

    const data = await response.json()
    let responseContent = data.choices?.[0]?.message?.content || ''

    if (enhancedPrompt.needsFollowUp) {
      const followUpPrefix = credibilityService.getFollowUpOpening() + '\n\n' +
        enhancedPrompt.followUpQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n') + '\n\n---\n\n'
      responseContent = followUpPrefix + responseContent
    }

    responseContent += '\n\n' + credibilityService.getDisclaimer()

    if (literatureResult && literatureResult.citations && literatureResult.citations.length > 0) {
      responseContent += '\n\n---\n\n**📚 引用资料**\n'
      literatureResult.citations.forEach((c: any, i: number) => {
        const ifText = c.impactFactor ? ` (IF: ${c.impactFactor})` : ''
        responseContent += `\n**[${i + 1}] [${c.typeLabel}] ${c.title}**${ifText}\n`
        responseContent += `   📝 ${c.authors}\n`
        responseContent += `   📖 ${c.journal}, ${c.year}\n`
        responseContent += `   📌 **引用内容**: ${c.citationContent}\n`
      })
    }

    return responseContent
  }

  async *chatStream(options: ChatCompletionOptions): AsyncGenerator<StreamChunk> {
    const effectiveApiKey = this.getEffectiveApiKey(options)
    if (!this.hasApiKey(effectiveApiKey)) {
      const demoText = this.getDemoResponse()
      for (const char of demoText) {
        yield { content: char, done: false }
        await new Promise(resolve => setTimeout(resolve, 20))
      }
      yield { content: '', done: true }
      return
    }

    const sessionId = options.sessionId || `session_${Date.now()}`
    const conversationType = options.ragCategory === 'medical_report' ? 'REPORT' :
                            options.ragCategory === 'drug_info' ? 'DRUG' : 'CHAT'
    
    const lastUserMessage = options.messages.filter(m => m.role === 'user').pop()
    const userInput = lastUserMessage?.content || ''
    
    let systemPrompt: string
    let agentInfo: { id: string; name: string; emoji: string } | undefined
    if (options.useAgent !== false && userInput) {
      const agentResult = this.getAgentSystemPrompt(userInput)
      systemPrompt = agentResult.prompt
      agentInfo = agentResult.agentInfo
    } else {
      systemPrompt = this.getSystemPrompt(conversationType)
    }

    const systemMessages: ChatMessage[] = [{ 
      role: 'system', 
      content: systemPrompt
    }]

    const model = this.getEffectiveModel(userInput, options.modelType, options)
    const baseUrl = this.getEffectiveBaseUrl(options)

    const enhancedPrompt = credibilityService.buildEnhancedPrompt(userInput, sessionId)

    if (enhancedPrompt.isEmergency) {
      yield { 
        content: enhancedPrompt.emergencyWarning + '\n\n', 
        done: false 
      }
      yield { 
        content: credibilityService.getDisclaimer(), 
        done: false 
      }
      yield { 
        content: '', 
        done: true,
        isEmergency: true
      }
      return
    }

    const ragPromise = options.useRAG && this.ragService && lastUserMessage
      ? this.ragService.searchWithRerank({
          query: lastUserMessage.content,
          category: options.ragCategory,
          healthRecordId: options.healthRecordId,
        }).catch(() => [])
      : Promise.resolve([])

    const litPromise = new Promise<any>((resolve) => {
      try {
        if (userInput && userInput.length > 0) {
          resolve(literatureService.deepSearch(userInput, 3))
        } else {
          resolve(undefined)
        }
      } catch (e) {
        log.error({ error: e }, 'Literature search error')
        resolve(undefined)
      }
    })

    const [ragRes, literatureSearchResult] = await Promise.all([ragPromise, litPromise])
    let ragResults = ragRes

    const messages: ChatMessage[] = [...systemMessages]

    const combinedContext: string[] = []

    if (literatureSearchResult && literatureSearchResult.citations.length > 0) {
      const literatureContext = literatureSearchResult.citations.slice(0, 3).map((c: any, i: number) => {
        const refNum = i + 1
        return `[${refNum}] ${c.title} (${c.journal}, ${c.year}) - ${c.citationContent}`
      }).join('\n')
      combinedContext.push(literatureContext)
      log.debug({ count: literatureSearchResult.citations.length }, 'Literature context added')
    }

    if (ragResults.length > 0) {
      const ragContext = ragResults.slice(0, 3).map((r, i) => {
        const refNum = (Math.min(literatureSearchResult?.citations?.length || 0, 3)) + i + 1
        return `[${refNum}] ${r.content.substring(0, 200)}`
      }).join('\n')
      combinedContext.push(ragContext)
    }

    if (combinedContext.length > 0) {
      const fullContext = combinedContext.join('\n')
      messages.push({
        role: 'system',
        content: `参考资料（回答时标注引用编号[1][2]）:\n${fullContext}`,
      })
    }

    const hasUsefulContext = combinedContext.length > 0
    
    if (enhancedPrompt.needsFollowUp && !hasUsefulContext) {
      const sources = ragResults.map(r => ({ source: r.source, content: r.content }))
      
      yield { content: credibilityService.getFollowUpOpening() + '\n\n', done: false }
      
      for (let i = 0; i < enhancedPrompt.followUpQuestions.length; i++) {
        yield { content: `${i + 1}. ${enhancedPrompt.followUpQuestions[i]}\n`, done: false }
      }
      
      yield { content: '\n', done: false }
      yield { content: credibilityService.getDisclaimer(), done: false }
      yield { 
        content: '', 
        done: true,
        needsFollowUp: true,
        followUpQuestions: enhancedPrompt.followUpQuestions,
        citations: [],
        sources,
        deepSearchResult: { totalSearched: 0, totalCited: 0, citations: [], searchSummary: '未检索到相关文献' },
        agentUsed: agentInfo
      }
      return
    }

    messages.push(...options.messages)

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${effectiveApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`LLM request failed: ${response.status} ${error}`)
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    
    const literatureCitations = literatureSearchResult?.citations || []
    
    const sources = literatureCitations.length > 0
      ? literatureCitations.map((c: any, i: number) => ({
          source: `${c.title} (${c.journal}, ${c.year})`,
          content: `[文献${i + 1}] ${c.title}\n作者: ${c.authors}\n来源: ${c.journal}, ${c.year}\n影响因子: ${c.impactFactor || 'N/A'}\n引用内容: ${c.citationContent}`,
          type: c.typeLabel || '文献',
          ...c
        }))
      : ragResults.map(r => ({ source: r.source, content: r.content }))

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          yield { 
            content: '', 
            done: true, 
            sources,
            needsFollowUp: enhancedPrompt.needsFollowUp,
            followUpQuestions: enhancedPrompt.followUpQuestions,
            citations: literatureCitations,
            deepSearchResult: literatureSearchResult || { 
              totalSearched: ragResults.length, 
              totalCited: 0, 
              citations: [], 
              searchSummary: `检索到 ${ragResults.length} 条相关资料` 
            },
            agentUsed: agentInfo
          }
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                yield { content, done: false }
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  async checkHealth(): Promise<boolean> {
    return !!this.apiKey
  }

  async listModels(): Promise<string[]> {
    return [this.complexModel, this.simpleModel]
  }

  getProvider(): string {
    return 'qwen'
  }

  getModel(): string {
    return this.complexModel
  }

  private getDemoResponse(): string {
    return `⚠️ **演示模式**

此项目已部署到 GitHub，但未配置 LLM API Key。

如果您是开发者，请按以下步骤配置：

1. 复制 \`server/.env.example\` 为 \`server/.env\`
2. 在阿里云百炼平台获取 API Key：https://bailian.console.aliyun.com/
3. 在 \`.env\` 中设置 \`QWEN_API_KEY=your-api-key\`
4. 重启后端服务

如果您是访客，这是一个 AI 健康咨询平台的演示项目，完整功能需要配置 LLM API。`
  }
}
