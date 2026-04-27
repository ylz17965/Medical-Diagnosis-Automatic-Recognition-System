import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { optionalAuth } from '../middleware/auth.middleware.js'
import { VisionService, DrugInfo, ReportInfo } from '../services/vision.service.js'
import { RAGService } from '../services/rag.service.js'
import { LLMService } from '../services/llm.service.js'
import multipart from '@fastify/multipart'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024

export interface AnalyzeResponse {
  success: boolean
  data?: {
    type: 'drug' | 'report'
    result: DrugInfo | ReportInfo
    interpretation?: string
  }
  error?: { message: string }
}

export default async function imageRoutes(fastify: FastifyInstance) {
  await fastify.register(multipart)
  
  const visionService = new VisionService()
  const ragService = new RAGService(fastify.prisma, fastify.redisCache)
  const llmService = new LLMService(ragService)

  fastify.post(
    '/analyze',
    {
      preHandler: [optionalAuth],
      schema: {
        tags: ['image'],
        consumes: ['multipart/form-data'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parts = request.parts()
      let imageBuffer: Buffer | null = null
      let imageType: 'drug' | 'report' = 'drug'
      let mimeType = 'image/jpeg'

      for await (const part of parts) {
        if (part.type === 'field') {
          if (part.fieldname === 'type') {
            imageType = part.value as 'drug' | 'report'
          }
        } else if (part.type === 'file') {
          if (!ALLOWED_MIME_TYPES.includes(part.mimetype)) {
            return reply.status(400).send({
              success: false,
              error: { message: '不支持的文件类型，仅支持 JPG、PNG、GIF、WEBP 格式' },
            })
          }
          mimeType = part.mimetype
          
          const chunks: Buffer[] = []
          for await (const chunk of part.file) {
            chunks.push(chunk)
          }
          imageBuffer = Buffer.concat(chunks)
          
          if (imageBuffer.length > MAX_FILE_SIZE) {
            return reply.status(400).send({
              success: false,
              error: { message: '文件大小超过限制（最大10MB）' },
            })
          }
        }
      }

      if (!imageBuffer) {
        return reply.status(400).send({
          success: false,
          error: { message: '未找到上传的图片' },
        })
      }

      try {
        const base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`
        
        const userApiKey = request.headers['x-api-key'] as string | undefined
        const userApiBaseUrl = request.headers['x-api-base-url'] as string | undefined
        const userVisionModel = request.headers['x-model-vision'] as string | undefined
        const visionOptions = userApiKey ? { userApiKey, userApiBaseUrl, userVisionModel } : undefined

        const result = await visionService.analyzeImage(base64Image, imageType, visionOptions)

        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        })

        const resultData = JSON.stringify({ type: imageType, result })
        reply.raw.write(`data: ${JSON.stringify({ event: 'result', data: resultData })}\n\n`)

        let interpretationPrompt = ''

        if (imageType === 'drug') {
          const drugInfo = result as DrugInfo
          const drugName = drugInfo.name || drugInfo.genericName || '未知药品'
          
          const ragResults = await ragService.searchWithRerank({
            query: drugName,
            category: 'drug_info',
            topK: 3,
          })
          
          const ragContext = ragResults.length > 0
            ? `\n参考资料：\n${ragResults.map(r => r.content).join('\n\n')}`
            : ''

          interpretationPrompt = `请根据以下药品信息，为用户提供详细的用药指导。

药品信息：
${JSON.stringify(drugInfo, null, 2)}
${ragContext}

请用通俗易懂的语言解释：
1. 这个药品主要用来治疗什么疾病
2. 正确的用法用量
3. 需要注意的事项和禁忌
4. 可能的副作用

最后请加上免责声明。`
        } else {
          const reportInfo = result as ReportInfo
          
          if (reportInfo.abnormalItems.length > 0) {
            const abnormalQueries = reportInfo.abnormalItems
              .map(item => `${item.name}${item.value ? ` ${item.value}${item.unit || ''}` : ''}`)
              .join('、')
            
            const ragResults = await ragService.searchWithRerank({
              query: `体检报告异常指标解读：${abnormalQueries}`,
              category: 'medical_report',
              topK: 5,
            })
            
            const ragContext = ragResults.length > 0
              ? `\n参考资料：\n${ragResults.map(r => r.content).join('\n\n')}`
              : ''

            interpretationPrompt = `请解读以下体检报告中的异常指标。

异常指标：
${reportInfo.abnormalItems.map(item => 
  `- ${item.name}: ${item.value}${item.unit || ''}（参考范围：${item.referenceRange || '未知'}）`
).join('\n')}
${ragContext}

请为每个异常指标提供：
1. 指标的含义
2. 可能的原因
3. 生活建议
4. 是否需要就医

最后请加上免责声明。`
          } else {
            interpretationPrompt = `请为以下体检报告提供整体解读和建议。

报告摘要：
${reportInfo.summary || '无明显异常'}

请提供：
1. 整体健康评估
2. 健康生活建议
3. 后续体检建议

最后请加上免责声明。`
          }
        }

        const stream = llmService.chatStream({
          messages: [{ role: 'user', content: interpretationPrompt }],
          modelType: 'simple',
          useRAG: false,
          useAgent: false,
          userApiKey,
          userApiBaseUrl,
          userSimpleModel: request.headers['x-model-simple'] as string | undefined,
        })

        for await (const chunk of stream) {
          if (chunk.content) {
            reply.raw.write(`data: ${JSON.stringify({ event: 'chunk', data: chunk.content })}\n\n`)
          }
          if (chunk.done) {
            reply.raw.write(`data: ${JSON.stringify({ event: 'done' })}\n\n`)
          }
        }

        reply.raw.end()
      } catch (error) {
        console.error('Image analysis error:', error)
        if (!reply.raw.writableEnded) {
          reply.raw.write(`data: ${JSON.stringify({ event: 'error', data: error instanceof Error ? error.message : '图片分析失败' })}\n\n`)
          reply.raw.end()
        }
      }
    }
  )

  fastify.post(
    '/recognize-drug',
    {
      preHandler: [optionalAuth],
      schema: {
        tags: ['image'],
        consumes: ['multipart/form-data'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await request.file()
      
      if (!data) {
        return reply.status(400).send({
          success: false,
          error: { message: '未找到上传的图片' },
        })
      }

      if (!ALLOWED_MIME_TYPES.includes(data.mimetype)) {
        return reply.status(400).send({
          success: false,
          error: { message: '不支持的文件类型' },
        })
      }

      const chunks: Buffer[] = []
      for await (const chunk of data.file) {
        chunks.push(chunk)
      }
      const buffer = Buffer.concat(chunks)

      if (buffer.length > MAX_FILE_SIZE) {
        return reply.status(400).send({
          success: false,
          error: { message: '文件大小超过限制（最大10MB）' },
        })
      }

      try {
        const base64Image = `data:${data.mimetype};base64,${buffer.toString('base64')}`
        const userApiKey = request.headers['x-api-key'] as string | undefined
        const userApiBaseUrl = request.headers['x-api-base-url'] as string | undefined
        const userVisionModel = request.headers['x-model-vision'] as string | undefined
        const visionOptions = userApiKey ? { userApiKey, userApiBaseUrl, userVisionModel } : undefined
        const result = await visionService.recognizeDrug(base64Image, visionOptions)
        
        return reply.send({
          success: true,
          data: result,
        })
      } catch (error) {
        console.error('Drug recognition error:', error)
        return reply.status(500).send({
          success: false,
          error: { message: error instanceof Error ? error.message : '药品识别失败' },
        })
      }
    }
  )

  fastify.post(
    '/extract-report',
    {
      preHandler: [optionalAuth],
      schema: {
        tags: ['image'],
        consumes: ['multipart/form-data'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await request.file()
      
      if (!data) {
        return reply.status(400).send({
          success: false,
          error: { message: '未找到上传的图片' },
        })
      }

      if (!ALLOWED_MIME_TYPES.includes(data.mimetype)) {
        return reply.status(400).send({
          success: false,
          error: { message: '不支持的文件类型' },
        })
      }

      const chunks: Buffer[] = []
      for await (const chunk of data.file) {
        chunks.push(chunk)
      }
      const buffer = Buffer.concat(chunks)

      if (buffer.length > MAX_FILE_SIZE) {
        return reply.status(400).send({
          success: false,
          error: { message: '文件大小超过限制（最大10MB）' },
        })
      }

      try {
        const base64Image = `data:${data.mimetype};base64,${buffer.toString('base64')}`
        const userApiKey = request.headers['x-api-key'] as string | undefined
        const userApiBaseUrl = request.headers['x-api-base-url'] as string | undefined
        const userVisionModel = request.headers['x-model-vision'] as string | undefined
        const visionOptions = userApiKey ? { userApiKey, userApiBaseUrl, userVisionModel } : undefined
        const result = await visionService.analyzeReport(base64Image, visionOptions)
        
        return reply.send({
          success: true,
          data: result,
        })
      } catch (error) {
        console.error('Report extraction error:', error)
        return reply.status(500).send({
          success: false,
          error: { message: error instanceof Error ? error.message : '报告提取失败' },
        })
      }
    }
  )
}
