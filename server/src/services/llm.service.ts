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

  private hasApiKey(): boolean {
    return !!this.apiKey && this.apiKey.length > 0
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
    if (!this.hasApiKey()) {
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

    const model = this.selectModel(userInput, options.modelType)

    if (options.useRAG && this.ragService && lastUserMessage) {
      try {
        const results = await this.ragService.searchWithRerank({
          query: lastUserMessage.content,
          category: options.ragCategory,
          healthRecordId: options.healthRecordId,
        })
        const context = results.map(r => r.content).join('\n\n---\n\n')
        
        if (context) {
          messages.push({
            role: 'system',
            content: `以下是与用户问题相关的参考资料：\n\n${context}`,
          })
        }
      } catch (error) {
        log.error({ error }, 'RAG search error')
      }
    }

    messages.push(...options.messages)

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
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

    responseContent = credibilityService.formatResponseWithMetadata(
      responseContent,
      enhancedPrompt.sources,
      !enhancedPrompt.needsFollowUp
    )

    return responseContent
  }

  async *chatStream(options: ChatCompletionOptions): AsyncGenerator<StreamChunk> {
    if (!this.hasApiKey()) {
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

    const model = this.selectModel(userInput, options.modelType)

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
        })
      : Promise.resolve([])

    let ragResults: Awaited<typeof ragPromise> = []

    const messages: ChatMessage[] = [...systemMessages]

    if (options.useRAG && lastUserMessage) {
      try {
        if (this.ragService) {
          ragResults = await ragPromise
          log.debug({ count: ragResults.length }, 'RAG search results')
        }
        
        if (ragResults.length > 0) {
          const ragContext = ragResults.map((r, i) => `[资料${i + 1}] ${r.content}`).join('\n\n---\n\n')
          messages.push({
            role: 'system',
            content: `以下是与用户问题相关的权威参考资料，请在回答时优先引用这些内容，并在相关段落末尾标注引用编号[1][2]等：

${ragContext}

【回答要求】
1. 请基于上述参考资料回答用户问题
2. 在引用具体内容时，请在句末标注引用编号，如[1][2]
3. 如果参考资料与问题不完全相关，请明确说明并提供一般性建议
4. 保持回答的专业性和准确性`,
          })
        }
      } catch (error) {
        log.error({ error }, 'RAG search error')
      }
    }

    const hasUsefulContext = ragResults.length > 0
    
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

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
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
    const sources = ragResults.map(r => ({ source: r.source, content: r.content }))
    
    let literatureCitations: any[] = []
    let literatureSearchResult: any = undefined
    
    try {
      if (userInput && userInput.length > 0) {
        try {
          literatureSearchResult = literatureService.deepSearch(userInput, 8)
          literatureCitations = literatureSearchResult.citations || []
          log.debug({ count: literatureCitations.length }, 'Literature search completed')
        } catch (litError) {
          log.error({ error: litError }, 'Literature search error')
        }
      }

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
