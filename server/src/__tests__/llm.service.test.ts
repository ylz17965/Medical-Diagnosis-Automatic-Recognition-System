import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LLMService } from '../services/llm.service.js'

vi.mock('../config/index.js', () => ({
  config: {
    qwen: {
      apiKey: 'test-api-key',
      baseUrl: 'https://test.api.com',
      models: {
        complex: 'qwen-max',
        simple: 'qwen-turbo',
        embedding: 'text-embedding-v3',
        rerank: 'gte-rerank',
        vision: 'qwen-vl-max',
        ocr: 'qwen-vl-ocr',
      },
    },
  },
}))

vi.mock('../services/credibility.service.js', () => ({
  credibilityService: {
    getSystemPrompt: vi.fn().mockReturnValue('You are a helpful medical assistant.'),
    buildEnhancedPrompt: vi.fn().mockReturnValue({
      isEmergency: false,
      needsFollowUp: false,
      followUpQuestions: [],
      sources: [],
    }),
    getDisclaimer: vi.fn().mockReturnValue('Disclaimer text'),
    getFollowUpOpening: vi.fn().mockReturnValue('请提供更多信息：'),
    formatResponseWithMetadata: vi.fn().mockImplementation((content) => content),
  },
}))

vi.mock('../services/agent.service.js', () => ({
  routeToAgent: vi.fn().mockReturnValue({ agentId: 'general' }),
  getAgentSystemPrompt: vi.fn().mockReturnValue('Agent prompt'),
  loadAgent: vi.fn().mockReturnValue({
    name: 'General Agent',
    emoji: '🤖',
  }),
}))

vi.mock('../services/literature.service.js', () => ({
  literatureService: {
    deepSearch: vi.fn().mockReturnValue({
      citations: [],
      searchSummary: 'No citations found',
    }),
  },
}))

describe('LLMService', () => {
  let llmService: LLMService

  beforeEach(() => {
    llmService = new LLMService()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('isComplexQuestion', () => {
    it('should identify complex questions by keywords', () => {
      expect(llmService.isComplexQuestion('请解释肺癌的病理机制')).toBe(true)
      expect(llmService.isComplexQuestion('详细分析我的体检报告')).toBe(true)
      expect(llmService.isComplexQuestion('这个药有什么副作用和禁忌症')).toBe(true)
    })

    it('should identify simple questions', () => {
      expect(llmService.isComplexQuestion('头痛怎么办')).toBe(false)
      expect(llmService.isComplexQuestion('感冒吃什么药')).toBe(false)
    })

    it('should consider long questions as complex', () => {
      const longQuestion = '我最近感觉身体不太舒服，头痛发热已经持续了三天，吃了退烧药也没有明显好转，请问我的症状的病理机制是什么？'
      expect(llmService.isComplexQuestion(longQuestion)).toBe(true)
    })
  })

  describe('selectModel', () => {
    it('should return complex model for complex questions', () => {
      const model = llmService.selectModel('请详细解释肺癌的病理机制')
      expect(model).toBe('qwen-max')
    })

    it('should return simple model for simple questions', () => {
      const model = llmService.selectModel('头痛怎么办')
      expect(model).toBe('qwen-turbo')
    })

    it('should respect explicit model type', () => {
      expect(llmService.selectModel('test', 'complex')).toBe('qwen-max')
      expect(llmService.selectModel('test', 'simple')).toBe('qwen-turbo')
    })
  })

  describe('getSystemPrompt', () => {
    it('should return base prompt for CHAT type', () => {
      const prompt = llmService.getSystemPrompt('CHAT')
      expect(prompt).toContain('medical assistant')
    })

    it('should include report-specific instructions', () => {
      const prompt = llmService.getSystemPrompt('REPORT')
      expect(prompt).toContain('体检报告解读')
    })

    it('should include drug-specific instructions', () => {
      const prompt = llmService.getSystemPrompt('DRUG')
      expect(prompt).toContain('用药指导')
    })
  })

  describe('checkHealth', () => {
    it('should return true when API key exists', async () => {
      const health = await llmService.checkHealth()
      expect(health).toBe(true)
    })
  })

  describe('listModels', () => {
    it('should return available models', async () => {
      const models = await llmService.listModels()
      expect(models).toContain('qwen-max')
      expect(models).toContain('qwen-turbo')
    })
  })

  describe('getProvider', () => {
    it('should return qwen as provider', () => {
      expect(llmService.getProvider()).toBe('qwen')
    })
  })

  describe('getModel', () => {
    it('should return complex model as default', () => {
      expect(llmService.getModel()).toBe('qwen-max')
    })
  })
})
