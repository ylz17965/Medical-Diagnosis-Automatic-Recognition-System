interface AnalyticsEvent {
  type: string
  timestamp: string
  sessionId: string
  data: Record<string, unknown>
}

interface UserTestSession {
  id: string
  startedAt: string
  endedAt?: string
  events: AnalyticsEvent[]
  metrics: {
    totalMessages: number
    avgResponseTime: number
    featuresUsed: string[]
    errorCount: number
    clarificationCount: number
  }
}

class AnalyticsService {
  private events: AnalyticsEvent[] = []
  private sessionId: string
  private startTime: string
  private metrics = {
    totalMessages: 0,
    responseTimes: [] as number[],
    featuresUsed: new Set<string>(),
    errorCount: 0,
    clarificationCount: 0
  }

  constructor() {
    this.sessionId = this.generateSessionId()
    this.startTime = new Date().toISOString()
    this.loadFromStorage()
  }

  private generateSessionId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('analytics_session')
      if (stored) {
        const data = JSON.parse(stored)
        if (data.sessionId && Date.now() - new Date(data.startTime).getTime() < 3600000) {
          this.sessionId = data.sessionId
          this.startTime = data.startTime
          this.events = data.events || []
          this.metrics = data.metrics || this.metrics
        }
      }
    } catch {
      // Ignore parsing errors
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('analytics_session', JSON.stringify({
        sessionId: this.sessionId,
        startTime: this.startTime,
        events: this.events,
        metrics: {
          ...this.metrics,
          featuresUsed: Array.from(this.metrics.featuresUsed)
        }
      }))
    } catch {
      // Storage might be full
    }
  }

  trackEvent(type: string, data: Record<string, unknown> = {}): void {
    const event: AnalyticsEvent = {
      type,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      data
    }
    this.events.push(event)
    this.saveToStorage()
  }

  trackMessage(role: 'user' | 'assistant', content: string, metadata: Record<string, unknown> = {}): void {
    this.metrics.totalMessages++
    this.trackEvent('message', { role, contentLength: content.length, ...metadata })
  }

  trackResponseTime(duration: number): void {
    this.metrics.responseTimes.push(duration)
    this.trackEvent('response_time', { duration })
  }

  trackFeatureUsage(feature: string): void {
    this.metrics.featuresUsed.add(feature)
    this.trackEvent('feature_used', { feature })
  }

  trackError(error: string, context: Record<string, unknown> = {}): void {
    this.metrics.errorCount++
    this.trackEvent('error', { error, ...context })
  }

  trackClarification(): void {
    this.metrics.clarificationCount++
    this.trackEvent('clarification_requested', {})
  }

  trackIntentRecognized(intent: string, confidence: number): void {
    this.trackEvent('intent_recognized', { intent, confidence })
  }

  trackEntityExtracted(entities: string[]): void {
    this.trackEvent('entities_extracted', { entities, count: entities.length })
  }

  trackSourceViewed(sourceCount: number): void {
    this.trackEvent('source_viewed', { sourceCount })
    this.trackFeatureUsage('source_traceability')
  }

  trackConfidenceViewed(confidence: number): void {
    this.trackEvent('confidence_viewed', { confidence })
    this.trackFeatureUsage('confidence_display')
  }

  getSession(): UserTestSession {
    const avgResponseTime = this.metrics.responseTimes.length > 0
      ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
      : 0

    return {
      id: this.sessionId,
      startedAt: this.startTime,
      endedAt: new Date().toISOString(),
      events: this.events,
      metrics: {
        totalMessages: this.metrics.totalMessages,
        avgResponseTime,
        featuresUsed: Array.from(this.metrics.featuresUsed),
        errorCount: this.metrics.errorCount,
        clarificationCount: this.metrics.clarificationCount
      }
    }
  }

  endSession(): UserTestSession {
    const session = this.getSession()
    this.trackEvent('session_end', {
      totalMessages: this.metrics.totalMessages,
      errorCount: this.metrics.errorCount
    })
    return session
  }

  resetSession(): void {
    this.events = []
    this.sessionId = this.generateSessionId()
    this.startTime = new Date().toISOString()
    this.metrics = {
      totalMessages: 0,
      responseTimes: [],
      featuresUsed: new Set<string>(),
      errorCount: 0,
      clarificationCount: 0
    }
    localStorage.removeItem('analytics_session')
    this.trackEvent('session_start', {})
  }

  getMetricsSummary(): {
    totalMessages: number
    avgResponseTime: number
    featuresUsedCount: number
    errorRate: number
    clarificationRate: number
  } {
    const avgResponseTime = this.metrics.responseTimes.length > 0
      ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
      : 0

    return {
      totalMessages: this.metrics.totalMessages,
      avgResponseTime,
      featuresUsedCount: this.metrics.featuresUsed.size,
      errorRate: this.metrics.totalMessages > 0 
        ? this.metrics.errorCount / this.metrics.totalMessages 
        : 0,
      clarificationRate: this.metrics.totalMessages > 0
        ? this.metrics.clarificationCount / this.metrics.totalMessages
        : 0
    }
  }
}

export const analyticsService = new AnalyticsService()
export type { AnalyticsEvent, UserTestSession }
