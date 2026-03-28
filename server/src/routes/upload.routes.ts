import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { authenticate } from '../middleware/auth.middleware.js'
import { ValidationError } from '../middleware/error-handler.middleware.js'
import multipart from '@fastify/multipart'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024

export default async function uploadRoutes(fastify: FastifyInstance) {
  await fastify.register(multipart)

  fastify.post(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['upload'],
        consumes: ['multipart/form-data'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await request.file()
      
      if (!data) {
        throw new ValidationError('未找到上传文件')
      }

      if (!ALLOWED_MIME_TYPES.includes(data.mimetype)) {
        throw new ValidationError('不支持的文件类型')
      }

      const chunks: Buffer[] = []
      for await (const chunk of data.file) {
        chunks.push(chunk)
      }
      const buffer = Buffer.concat(chunks)

      if (buffer.length > MAX_FILE_SIZE) {
        throw new ValidationError('文件大小超过限制（最大10MB）')
      }

      const fileId = crypto.randomUUID()
      const fileUrl = `/uploads/${fileId}-${data.filename}`

      return reply.send({
        success: true,
        data: {
          id: fileId,
          filename: data.filename,
          mimetype: data.mimetype,
          size: buffer.length,
          url: fileUrl,
        },
      })
    }
  )
}
