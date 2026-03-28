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

请根据用户的问题和提供的参考资料，给出专业、有帮助的回答。`

export class LLMService {
  private apiKey: string | undefined
  private baseUrl: string
  private model: string
  private ragService: RAGService | null = null

  constructor(ragService?: RAGService) {
    this.apiKey = config.llm.qwen.apiKey
    this.baseUrl = config.llm.qwen.baseUrl
    this.model = 'qwen-max'
    this.ragService = ragService || null
  }

  async chat(options: ChatCompletionOptions): Promise<string> {
    const messages = await this.buildMessages(options)

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
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
    const messages = await this.buildMessages(options)

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
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
    let sources: Array<{ source: string; content: string }> = []

    if (options.useRAG && this.ragService) {
      const lastUserMessage = options.messages.filter(m => m.role === 'user').pop()
      if (lastUserMessage) {
        const ragResults = await this.ragService.searchSimilar({
          query: lastUserMessage.content,
          category: options.ragCategory,
          healthRecordId: options.healthRecordId,
        })
        sources = ragResults.map(r => ({ source: r.source, content: r.content }))
      }
    }

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

  private async buildMessages(options: ChatCompletionOptions): Promise<ChatMessage[]> {
    let messages: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }]

    if (options.useRAG && this.ragService) {
      const lastUserMessage = options.messages.filter(m => m.role === 'user').pop()
      if (lastUserMessage) {
        const context = await this.ragService.buildContextForQuery({
          query: lastUserMessage.content,
          category: options.ragCategory,
          healthRecordId: options.healthRecordId,
        })

        if (context) {
          messages.push({
            role: 'system',
            content: `以下是与用户问题相关的参考资料：\n\n${context}`,
          })
        }
      }
    }

    messages.push(...options.messages)
    return messages
  }

  async checkHealth(): Promise<boolean> {
    return !!this.apiKey
  }

  async listModels(): Promise<string[]> {
    return [this.model]
  }

  getProvider(): string {
    return 'qwen'
  }

  getModel(): string {
    return this.model
  }
}
