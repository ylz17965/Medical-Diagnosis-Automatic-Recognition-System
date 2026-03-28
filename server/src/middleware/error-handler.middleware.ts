import { FastifyError, FastifyRequest, FastifyReply } from 'fastify'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
    public code?: string
  ) {
    super(message)
    Object.setPrototypeOf(this, AppError.prototype)
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors?: any[]) {
    super(message, 400, true, 'VALIDATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '资源不存在') {
    super(message, 404, true, 'NOT_FOUND')
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = '未授权') {
    super(message, 401, true, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = '禁止访问') {
    super(message, 403, true, 'FORBIDDEN')
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, true, 'CONFLICT')
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = '请求过于频繁') {
    super(message, 429, true, 'TOO_MANY_REQUESTS')
  }
}

export const errorHandler = (
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const isProduction = process.env.NODE_ENV === 'production'

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code || 'APP_ERROR',
        message: error.message,
        ...(error instanceof ValidationError && { details: error.errors }),
      },
    })
  }

  if ('validation' in error && error.validation) {
    const errors = error.validation.map((err: any) => ({
      field: err.instancePath || err.params?.missingProperty,
      message: err.message,
    }))
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '输入验证失败',
        details: errors,
      },
    })
  }

  request.log.error({
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
  })

  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? '服务器内部错误' : error.message,
    },
  })
}
