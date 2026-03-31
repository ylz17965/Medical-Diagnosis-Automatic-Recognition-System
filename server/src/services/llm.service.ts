import { config } from '../config/index.js'
import { RAGService } from './rag.service.js'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
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
}

export interface StreamChunk {
  content: string
  done: boolean
  sources?: Array<{ source: string; content: string }>
}

const SYSTEM_PROMPT = `你是一个专业的健康咨询助手"智疗助手"。你的职责是：

1. 提供健康相关的咨询和建议
2. 解读体检报告和医疗检查结果
3. 提供用药指导和药物信息
4. 回答健康生活方式相关问题

注意事项：
- 你不是医生，不能替代专业医疗诊断
- 对于严重症状，建议用户及时就医
- 回答要专业、准确、易懂
- 如果不确定，请诚实告知用户
- 所有回答必须包含免责声明

请根据用户的问题和提供的参考资料，给出专业、有帮助的回答。`

const REPORT_SYSTEM_PROMPT = `你是一个专业的体检报告解读助手。你的职责是：

1. 解读体检报告中的各项指标
2. 解释指标的含义和正常范围
3. 分析异常指标可能的原因
4. 提供生活建议和就医建议

注意事项：
- 你不是医生，不能替代专业医疗诊断
- 对于严重异常指标，建议用户及时就医
- 回答要专业、准确、易懂
- 所有回答必须包含免责声明

请根据用户提供的体检报告内容，给出专业、有帮助的解读。`

const DRUG_SYSTEM_PROMPT = `你是一个专业的用药指导助手。你的职责是：

1. 提供药品的基本信息（名称、成分、适应症）
2. 解释用法用量
3. 说明注意事项和禁忌症
4. 提供可能的副作用信息

注意事项：
- 你不是医生或药师，不能替代专业用药指导
- 对于处方药，建议用户遵医嘱使用
- 回答要专业、准确、易懂
- 所有回答必须包含免责声明

请根据用户提供的药品信息，给出专业、有帮助的用药指导。`

const COMPLEX_KEYWORDS = [
  '病理', '机制', '原理', '深度', '详细', '全面', '分析',
  '诊断', '鉴别', '并发症', '预后', '治疗方案',
  '相互作用', '禁忌', '副作用', '不良反应',
  '异常', '偏高', '偏低', '指标', '检验'
]

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
    switch (type) {
      case 'REPORT':
        return REPORT_SYSTEM_PROMPT
      case 'DRUG':
        return DRUG_SYSTEM_PROMPT
      default:
        return SYSTEM_PROMPT
    }
  }

  async chat(options: ChatCompletionOptions): Promise<string> {
    if (!this.hasApiKey()) {
      return this.getDemoResponse()
    }

    const { messages } = await this.buildMessagesWithRAG(options)
    const lastUserMessage = options.messages.filter(m => m.role === 'user').pop()
    const model = this.selectModel(lastUserMessage?.content || '', options.modelType)

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
    return data.choices?.[0]?.message?.content || ''
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

    const { messages, sources } = await this.buildMessagesWithRAG(options)
    const lastUserMessage = options.messages.filter(m => m.role === 'user').pop()
    const model = this.selectModel(lastUserMessage?.content || '', options.modelType)

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

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          yield { content: '', done: true, sources }
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

  private async buildMessagesWithRAG(options: ChatCompletionOptions): Promise<{
    messages: ChatMessage[]
    sources: Array<{ source: string; content: string }>
  }> {
    const conversationType = options.ragCategory === 'medical_report' ? 'REPORT' :
                            options.ragCategory === 'drug_info' ? 'DRUG' : 'CHAT'
    
    const messages: ChatMessage[] = [{ 
      role: 'system', 
      content: this.getSystemPrompt(conversationType) 
    }]

    const sources: Array<{ source: string; content: string }> = []
    const lastUserMessage = options.messages.filter(m => m.role === 'user').pop()

    if (options.useRAG && this.ragService && lastUserMessage) {
      try {
        const ragResults = await this.ragService.searchWithRerank({
          query: lastUserMessage.content,
          category: options.ragCategory,
          healthRecordId: options.healthRecordId,
        })
        
        const context = ragResults.map(r => r.content).join('\n\n---\n\n')
        sources.push(...ragResults.map(r => ({ source: r.source, content: r.content })))
        
        if (context) {
          messages.push({
            role: 'system',
            content: `以下是与用户问题相关的参考资料：\n\n${context}`,
          })
        }
      } catch (error) {
        console.error('RAG search error:', error)
      }
    }

    messages.push(...options.messages)
    return { messages, sources }
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
