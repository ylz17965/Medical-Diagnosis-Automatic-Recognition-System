import { FastifyInstance } from 'fastify'

interface UserTestSession {
  id: string
  startedAt: string
  endedAt?: string
  events: Array<{
    type: string
    timestamp: string
    sessionId: string
    data: Record<string, unknown>
  }>
  metrics: {
    totalMessages: number
    avgResponseTime: number
    featuresUsed: string[]
    errorCount: number
    clarificationCount: number
  }
}

interface SUSResponse {
  susScore: number
  adjectiveRating: string
  responses: number[]
  submittedAt: string
}

interface CustomSurveyResponse {
  accuracy: number
  usefulness: number
  explainability: number
  nps: number
  comparison: string
  suggestions: string
  submittedAt: string
}

interface UserTestResult {
  sessionId: string
  session?: UserTestSession
  sus?: SUSResponse
  customSurvey?: CustomSurveyResponse
  submittedAt: string
}

const testResults: Map<string, UserTestResult> = new Map()

export default async function userTestRoutes(fastify: FastifyInstance) {
  fastify.post('/session', async (request, reply) => {
    try {
      const session = request.body as UserTestSession
      
      if (!session.id) {
        return reply.status(400).send({ error: 'Session ID is required' })
      }

      const existingResult = testResults.get(session.id) || {
        sessionId: session.id,
        submittedAt: new Date().toISOString()
      }

      testResults.set(session.id, {
        ...existingResult,
        session
      })

      return {
        success: true,
        data: { sessionId: session.id }
      }
    } catch (error) {
      fastify.log.error(error, '保存测试会话失败')
      return reply.status(500).send({ error: '保存测试会话失败' })
    }
  })

  fastify.post('/sus', async (request, reply) => {
    try {
      const body = request.body as { sessionId: string; sus: SUSResponse }
      
      if (!body.sessionId) {
        return reply.status(400).send({ error: 'Session ID is required' })
      }

      const existingResult = testResults.get(body.sessionId) || {
        sessionId: body.sessionId,
        submittedAt: new Date().toISOString()
      }

      testResults.set(body.sessionId, {
        ...existingResult,
        sus: body.sus
      })

      return {
        success: true,
        data: { susScore: body.sus.susScore }
      }
    } catch (error) {
      fastify.log.error(error, '保存SUS结果失败')
      return reply.status(500).send({ error: '保存SUS结果失败' })
    }
  })

  fastify.post('/custom-survey', async (request, reply) => {
    try {
      const body = request.body as { sessionId: string; survey: CustomSurveyResponse }
      
      if (!body.sessionId) {
        return reply.status(400).send({ error: 'Session ID is required' })
      }

      const existingResult = testResults.get(body.sessionId) || {
        sessionId: body.sessionId,
        submittedAt: new Date().toISOString()
      }

      testResults.set(body.sessionId, {
        ...existingResult,
        customSurvey: body.survey
      })

      return {
        success: true,
        data: { nps: body.survey.nps }
      }
    } catch (error) {
      fastify.log.error(error, '保存问卷结果失败')
      return reply.status(500).send({ error: '保存问卷结果失败' })
    }
  })

  fastify.post('/complete', async (request, reply) => {
    try {
      const body = request.body as { 
        sessionId: string
        session?: UserTestSession
        sus?: SUSResponse
        customSurvey?: CustomSurveyResponse
      }
      
      if (!body.sessionId) {
        return reply.status(400).send({ error: 'Session ID is required' })
      }

      const result: UserTestResult = {
        sessionId: body.sessionId,
        session: body.session,
        sus: body.sus,
        customSurvey: body.customSurvey,
        submittedAt: new Date().toISOString()
      }

      testResults.set(body.sessionId, result)

      return {
        success: true,
        data: { sessionId: body.sessionId }
      }
    } catch (error) {
      fastify.log.error(error, '保存测试结果失败')
      return reply.status(500).send({ error: '保存测试结果失败' })
    }
  })

  fastify.get('/results', async () => {
    const results = Array.from(testResults.values())
    
    const summary = {
      totalTests: results.length,
      averageSUSScore: 0,
      averageNPS: 0,
      averageAccuracy: 0,
      averageUsefulness: 0,
      averageExplainability: 0,
      comparisonDistribution: {} as Record<string, number>
    }

    const susScores: number[] = []
    const npsScores: number[] = []
    const accuracyScores: number[] = []
    const usefulnessScores: number[] = []
    const explainabilityScores: number[] = []

    for (const result of results) {
      if (result.sus) {
        susScores.push(result.sus.susScore)
      }
      if (result.customSurvey) {
        npsScores.push(result.customSurvey.nps)
        accuracyScores.push(result.customSurvey.accuracy)
        usefulnessScores.push(result.customSurvey.usefulness)
        explainabilityScores.push(result.customSurvey.explainability)
        
        const comp = result.customSurvey.comparison
        summary.comparisonDistribution[comp] = (summary.comparisonDistribution[comp] || 0) + 1
      }
    }

    if (susScores.length > 0) {
      summary.averageSUSScore = susScores.reduce((a, b) => a + b, 0) / susScores.length
    }
    if (npsScores.length > 0) {
      summary.averageNPS = npsScores.reduce((a, b) => a + b, 0) / npsScores.length
    }
    if (accuracyScores.length > 0) {
      summary.averageAccuracy = accuracyScores.reduce((a, b) => a + b, 0) / accuracyScores.length
    }
    if (usefulnessScores.length > 0) {
      summary.averageUsefulness = usefulnessScores.reduce((a, b) => a + b, 0) / usefulnessScores.length
    }
    if (explainabilityScores.length > 0) {
      summary.averageExplainability = explainabilityScores.reduce((a, b) => a + b, 0) / explainabilityScores.length
    }

    return {
      success: true,
      data: {
        summary,
        results: results.map(r => ({
          sessionId: r.sessionId,
          submittedAt: r.submittedAt,
          susScore: r.sus?.susScore,
          nps: r.customSurvey?.nps,
          totalMessages: r.session?.metrics.totalMessages,
          featuresUsed: r.session?.metrics.featuresUsed
        }))
      }
    }
  })

  fastify.get('/results/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string }
    const result = testResults.get(sessionId)

    if (!result) {
      return reply.status(404).send({ error: '测试结果未找到' })
    }

    return {
      success: true,
      data: result
    }
  })

  fastify.delete('/results/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string }
    
    if (!testResults.has(sessionId)) {
      return reply.status(404).send({ error: '测试结果未找到' })
    }

    testResults.delete(sessionId)

    return {
      success: true,
      data: { message: '测试结果已删除' }
    }
  })

  fastify.get('/export', async () => {
    const results = Array.from(testResults.values())
    
    const csvRows = [
      ['SessionID', 'SubmittedAt', 'SUSScore', 'NPS', 'Accuracy', 'Usefulness', 'Explainability', 'Comparison', 'TotalMessages', 'FeaturesUsed', 'Suggestions']
    ]

    for (const result of results) {
      csvRows.push([
        result.sessionId,
        result.submittedAt,
        result.sus?.susScore?.toString() || '',
        result.customSurvey?.nps?.toString() || '',
        result.customSurvey?.accuracy?.toString() || '',
        result.customSurvey?.usefulness?.toString() || '',
        result.customSurvey?.explainability?.toString() || '',
        result.customSurvey?.comparison || '',
        result.session?.metrics.totalMessages?.toString() || '',
        result.session?.metrics.featuresUsed?.join(';') || '',
        result.customSurvey?.suggestions || ''
      ])
    }

    const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    return {
      success: true,
      data: { csv: csvContent }
    }
  })
}
