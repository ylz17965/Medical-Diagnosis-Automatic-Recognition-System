type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogConfig {
  level: LogLevel
  enabled: boolean
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const config: LogConfig = {
  level: import.meta.env.DEV ? 'debug' : 'warn',
  enabled: import.meta.env.PROD ? false : true,
}

function formatTimestamp(): string {
  return new Date().toISOString().split('T')[1].slice(0, 12)
}

function formatMessage(level: LogLevel, module: string, message: string, data?: Record<string, unknown>): string {
  const timestamp = formatTimestamp()
  const levelStr = level.toUpperCase().padEnd(5)
  const moduleStr = `[${module}]`.padEnd(20)
  
  let formatted = `${timestamp} ${levelStr} ${moduleStr} ${message}`
  
  if (data && Object.keys(data).length > 0) {
    const serialized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Error) {
        serialized[key] = {
          name: value.name,
          message: value.message,
          stack: value.stack,
        }
      } else {
        serialized[key] = value
      }
    }
    formatted += ` ${JSON.stringify(serialized)}`
  }
  
  return formatted
}

export const createLogger = (module: string) => {
  const log = (level: LogLevel, message: string, data?: Record<string, unknown>) => {
    if (!config.enabled) return
    if (LOG_LEVELS[level] < LOG_LEVELS[config.level]) return
    
    const formattedMessage = formatMessage(level, module, message, data)
    
    switch (level) {
      case 'debug':
        console.debug(formattedMessage)
        break
      case 'info':
        console.info(formattedMessage)
        break
      case 'warn':
        console.warn(formattedMessage)
        break
      case 'error':
        console.error(formattedMessage)
        break
    }
  }

  return {
    debug: (message: string, data?: Record<string, unknown>) => log('debug', message, data),
    info: (message: string, data?: Record<string, unknown>) => log('info', message, data),
    warn: (message: string, data?: Record<string, unknown>) => log('warn', message, data),
    error: (message: string, data?: Record<string, unknown>) => log('error', message, data),
  }
}

export const logger = {
  debug: (module: string, message: string, data?: Record<string, unknown>) => createLogger(module).debug(message, data),
  info: (module: string, message: string, data?: Record<string, unknown>) => createLogger(module).info(message, data),
  warn: (module: string, message: string, data?: Record<string, unknown>) => createLogger(module).warn(message, data),
  error: (module: string, message: string, data?: Record<string, unknown>) => createLogger(module).error(message, data),
}

export default createLogger
