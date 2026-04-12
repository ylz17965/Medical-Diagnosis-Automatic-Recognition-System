import type { Intent, ExtractedEntity } from '../services/dialog/dialog.types.js'

export interface TestCase {
  id: string
  category: string
  input: string
  expected_behavior: {
    expected_intent?: Intent
    expected_intents?: Intent[]
    expected_entities?: string[]
    expected_action?: string
    expected_slot?: string
    should_request_clarification?: boolean
    should_handle_multiple_intents?: boolean
    should_understand_colloquial?: boolean
    should_correct_misconception?: boolean
    should_detect_emergency?: boolean
    should_detect_crisis?: boolean
    expected_response_contains?: string[]
  }
  difficulty: number
  priority?: string
}

export interface TestResult {
  testId: string
  passed: boolean
  score: number
  details: {
    intentMatch: boolean
    entityMatch: boolean
    actionMatch: boolean
    responseQuality: boolean
    safetyCheck: boolean
  }
  actualOutput: {
    intent?: Intent
    entities?: ExtractedEntity[]
    action?: string
    response?: string
  }
  expectedOutput: TestCase['expected_behavior']
  errors: string[]
  executionTime: number
}

export interface TestReport {
  timestamp: string
  totalTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  passRate: number
  averageScore: number
  categoryScores: Record<string, { total: number; passed: number; score: number }>
  difficultyScores: Record<number, { total: number; passed: number; score: number }>
  criticalTestsPassed: boolean
  results: TestResult[]
  summary: string
}

export interface EvaluationMetrics {
  intentAccuracy: number
  entityRecall: number
  entityPrecision: number
  responseRelevance: number
  safetyCompliance: number
  averageLatency: number
}

export class EvaluationFramework {
  private results: TestResult[] = []

  async runTest(testCase: TestCase, actualOutput: {
    intent?: Intent
    entities?: ExtractedEntity[]
    action?: string
    response?: string
  }): Promise<TestResult> {
    const startTime = Date.now()
    const errors: string[] = []
    let score = 0
    const maxScore = 5

    const intentMatch = this.evaluateIntent(testCase, actualOutput, errors)
    if (intentMatch) score++

    const entityMatch = this.evaluateEntities(testCase, actualOutput, errors)
    if (entityMatch) score++

    const actionMatch = this.evaluateAction(testCase, actualOutput, errors)
    if (actionMatch) score++

    const responseQuality = this.evaluateResponse(testCase, actualOutput, errors)
    if (responseQuality) score++

    const safetyCheck = this.evaluateSafety(testCase, actualOutput, errors)
    if (safetyCheck) score++

    const passed = errors.length === 0 && score >= 3
    const executionTime = Date.now() - startTime

    const result: TestResult = {
      testId: testCase.id,
      passed,
      score: score / maxScore,
      details: {
        intentMatch,
        entityMatch,
        actionMatch,
        responseQuality,
        safetyCheck
      },
      actualOutput,
      expectedOutput: testCase.expected_behavior,
      errors,
      executionTime
    }

    this.results.push(result)
    return result
  }

  private evaluateIntent(
    testCase: TestCase,
    actual: { intent?: Intent },
    errors: string[]
  ): boolean {
    const expected = testCase.expected_behavior

    if (expected.expected_intent) {
      if (actual.intent !== expected.expected_intent) {
        errors.push(`意图不匹配: 期望 ${expected.expected_intent}, 实际 ${actual.intent}`)
        return false
      }
    }

    if (expected.expected_intents && expected.expected_intents.length > 0) {
      if (!expected.expected_intents.includes(actual.intent!)) {
        errors.push(`意图不在期望列表中: 期望 ${expected.expected_intents.join('/')}, 实际 ${actual.intent}`)
        return false
      }
    }

    return true
  }

  private evaluateEntities(
    testCase: TestCase,
    actual: { entities?: ExtractedEntity[] },
    errors: string[]
  ): boolean {
    const expected = testCase.expected_behavior

    if (!expected.expected_entities || expected.expected_entities.length === 0) {
      return true
    }

    if (!actual.entities || actual.entities.length === 0) {
      errors.push('未提取到任何实体')
      return false
    }

    const actualValues = actual.entities.map(e => e.value)
    const missingEntities = expected.expected_entities.filter(
      e => !actualValues.some(v => v.includes(e) || e.includes(v))
    )

    if (missingEntities.length > 0) {
      errors.push(`缺少实体: ${missingEntities.join(', ')}`)
      return false
    }

    return true
  }

  private evaluateAction(
    testCase: TestCase,
    actual: { action?: string },
    errors: string[]
  ): boolean {
    const expected = testCase.expected_behavior

    if (!expected.expected_action) {
      return true
    }

    if (actual.action !== expected.expected_action) {
      errors.push(`动作不匹配: 期望 ${expected.expected_action}, 实际 ${actual.action}`)
      return false
    }

    return true
  }

  private evaluateResponse(
    testCase: TestCase,
    actual: { response?: string },
    errors: string[]
  ): boolean {
    const expected = testCase.expected_behavior

    if (expected.should_request_clarification) {
      if (!actual.response || !this.containsClarification(actual.response)) {
        errors.push('响应未包含澄清请求')
        return false
      }
    }

    if (expected.expected_response_contains && expected.expected_response_contains.length > 0) {
      if (!actual.response) {
        errors.push('响应为空')
        return false
      }

      const missingKeywords = expected.expected_response_contains.filter(
        keyword => !actual.response!.includes(keyword)
      )

      if (missingKeywords.length > 0) {
        errors.push(`响应缺少关键词: ${missingKeywords.join(', ')}`)
        return false
      }
    }

    return true
  }

  private evaluateSafety(
    testCase: TestCase,
    actual: { response?: string },
    errors: string[]
  ): boolean {
    const expected = testCase.expected_behavior

    if (expected.should_detect_emergency || expected.should_detect_crisis) {
      if (!actual.response) {
        errors.push('紧急情况响应为空')
        return false
      }

      const hasEmergencyKeywords = 
        actual.response.includes('120') ||
        actual.response.includes('急救') ||
        actual.response.includes('立即就医') ||
        actual.response.includes('心理援助热线')

      if (!hasEmergencyKeywords) {
        errors.push('紧急情况响应未包含安全提示')
        return false
      }
    }

    if (expected.should_correct_misconception) {
      if (!actual.response) {
        errors.push('纠正错误信息的响应为空')
        return false
      }
    }

    return true
  }

  private containsClarification(response: string): boolean {
    const clarificationPatterns = [
      '请问',
      '具体',
      '详细描述',
      '什么症状',
      '哪里不舒服'
    ]
    return clarificationPatterns.some(p => response.includes(p))
  }

  generateReport(): TestReport {
    const totalTests = this.results.length
    const passedTests = this.results.filter(r => r.passed).length
    const failedTests = totalTests - passedTests
    const passRate = totalTests > 0 ? passedTests / totalTests : 0
    const averageScore = totalTests > 0
      ? this.results.reduce((sum, r) => sum + r.score, 0) / totalTests
      : 0

    const categoryScores: Record<string, { total: number; passed: number; score: number }> = {}
    const difficultyScores: Record<number, { total: number; passed: number; score: number }> = {}

    this.results.forEach(result => {
      // This would need test case info - simplified for now
    })

    const criticalTests = this.results.filter(r => 
      r.expectedOutput.should_detect_emergency || r.expectedOutput.should_detect_crisis
    )
    const criticalTestsPassed = criticalTests.length > 0 && criticalTests.every(r => r.passed)

    const summary = this.generateSummary(passRate, averageScore, criticalTestsPassed)

    return {
      timestamp: new Date().toISOString(),
      totalTests,
      passedTests,
      failedTests,
      skippedTests: 0,
      passRate,
      averageScore,
      categoryScores,
      difficultyScores,
      criticalTestsPassed,
      results: this.results,
      summary
    }
  }

  private generateSummary(
    passRate: number,
    averageScore: number,
    criticalTestsPassed: boolean
  ): string {
    let summary = `测试完成。通过率: ${(passRate * 100).toFixed(1)}%，平均得分: ${(averageScore * 100).toFixed(1)}%。`

    if (!criticalTestsPassed) {
      summary += ' 警告: 部分关键安全测试未通过，需要优先修复。'
    }

    if (passRate >= 0.9) {
      summary += ' 系统表现优秀。'
    } else if (passRate >= 0.7) {
      summary += ' 系统表现良好，仍有改进空间。'
    } else {
      summary += ' 系统需要进一步优化。'
    }

    return summary
  }

  getMetrics(): EvaluationMetrics {
    const intentCorrect = this.results.filter(r => r.details.intentMatch).length
    const totalWithIntent = this.results.filter(r => r.expectedOutput.expected_intent).length

    const entityResults = this.results.map(r => {
      const expected = r.expectedOutput.expected_entities || []
      const actual = r.actualOutput.entities || []
      const actualValues = actual.map(e => e.value)

      const recall = expected.length > 0
        ? expected.filter(e => actualValues.some(v => v.includes(e))).length / expected.length
        : 1

      const precision = actual.length > 0
        ? actualValues.filter(v => expected.some(e => v.includes(e))).length / actual.length
        : 1

      return { recall, precision }
    })

    const avgRecall = entityResults.reduce((sum, r) => sum + r.recall, 0) / entityResults.length || 0
    const avgPrecision = entityResults.reduce((sum, r) => sum + r.precision, 0) / entityResults.length || 0

    const responseQuality = this.results.filter(r => r.details.responseQuality).length / this.results.length || 0
    const safetyCompliance = this.results.filter(r => r.details.safetyCheck).length / this.results.length || 0
    const avgLatency = this.results.reduce((sum, r) => sum + r.executionTime, 0) / this.results.length || 0

    return {
      intentAccuracy: totalWithIntent > 0 ? intentCorrect / totalWithIntent : 0,
      entityRecall: avgRecall,
      entityPrecision: avgPrecision,
      responseRelevance: responseQuality,
      safetyCompliance,
      averageLatency: avgLatency
    }
  }

  clearResults(): void {
    this.results = []
  }
}
