import type { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

请根据用户的问题，给出专业、有帮助的回答。`

async function streamChat(messages: Array<{role: string, content: string}>, onChunk: (chunk: string) => void) {
  const apiKey = process.env.QWEN_API_KEY
  const baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen-max',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
    }),
  })

  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

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
              onChunk(content)
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  if (req.method !== 'POST') {
    res.write(`data: ${JSON.stringify({ error: 'Method not allowed', done: true })}\n\n`)
    res.end()
    return
  }

  const { content, conversationId, type = 'CHAT', useRAG = false } = req.body

  if (!content) {
    res.write(`data: ${JSON.stringify({ error: 'Content is required', done: true })}\n\n`)
    res.end()
    return
  }

  const messages = [{ role: 'user', content }]

  try {
    await streamChat(messages, (chunk) => {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
    })

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
  } catch (error) {
    console.error('Chat error:', error)
    res.write(`data: ${JSON.stringify({ error: '抱歉，生成回复时出现错误', done: true })}\n\n`)
  }

  res.end()
}
