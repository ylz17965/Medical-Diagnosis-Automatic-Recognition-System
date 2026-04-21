import { describe, it, expect, beforeEach } from 'vitest'
import { credibilityService, type SessionState } from '../services/credibility.service.js'

describe('CredibilityService', () => {
  describe('getSystemPrompt', () => {
    it('should return system prompt with credibility rules', () => {
      const prompt = credibilityService.getSystemPrompt()

      expect(prompt).toContain('智疗助手')
      expect(prompt).toContain('核心规则')
      expect(prompt.length).toBeGreaterThan(100)
    })
  })

  describe('buildEnhancedPrompt', () => {
    it('should detect emergency keywords', () => {
      const result = credibilityService.buildEnhancedPrompt('我胸痛剧烈，呼吸困难，请帮帮我')

      expect(result.isEmergency).toBe(true)
      expect(result.emergencyWarning).toContain('紧急')
    })

    it('should detect emergency: difficulty breathing', () => {
      const result = credibilityService.buildEnhancedPrompt('呼吸困难')

      expect(result.isEmergency).toBe(true)
    })

    it('should detect emergency: severe bleeding', () => {
      const result = credibilityService.buildEnhancedPrompt('大出血')

      expect(result.isEmergency).toBe(true)
    })

    it('should not trigger emergency for normal questions', () => {
      const result = credibilityService.buildEnhancedPrompt('头痛怎么办')

      expect(result.isEmergency).toBe(false)
    })

    it('should generate follow-up questions for vague input', () => {
      const result = credibilityService.buildEnhancedPrompt('我不舒服')

      expect(result.needsFollowUp).toBe(true)
      expect(result.followUpQuestions.length).toBeGreaterThan(0)
    })
  })

  describe('getDisclaimer', () => {
    it('should return disclaimer text', () => {
      const disclaimer = credibilityService.getDisclaimer()

      expect(disclaimer).toContain('免责声明')
      expect(disclaimer).toContain('仅供参考')
    })
  })

  describe('getFollowUpOpening', () => {
    it('should return follow-up opening text', () => {
      const opening = credibilityService.getFollowUpOpening()

      expect(opening.length).toBeGreaterThan(0)
    })
  })

  describe('formatResponseWithMetadata', () => {
    it('should format response with sources', () => {
      const response = credibilityService.formatResponseWithMetadata(
        '这是回答内容',
        [{ source: '指南', content: '参考资料' }],
        true
      )

      expect(response).toContain('这是回答内容')
    })
  })

  describe('session state management', () => {
    it('should track session state', () => {
      const sessionId = 'test-session-001'
      const result = credibilityService.buildEnhancedPrompt('头痛', sessionId)

      expect(result).toBeDefined()
    })
  })
})
