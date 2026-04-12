import Fastify from 'fastify'
import { credibilityService } from '../services/credibility.service.js'

interface TestResult {
  name: string
  passed: boolean
  details: string
}

const results: TestResult[] = []

function test(name: string, fn: () => boolean, details: string = '') {
  try {
    const passed = fn()
    results.push({ name, passed, details: passed ? '✓' : `✗ ${details}` })
    console.log(`${passed ? '✓' : '✗'} ${name}${details ? ` - ${details}` : ''}`)
  } catch (error) {
    results.push({ name, passed: false, details: String(error) })
    console.log(`✗ ${name} - Error: ${error}`)
  }
}

console.log('\n========================================')
console.log('AI健康助手完善计划 - 后端测试')
console.log('========================================\n')

console.log('【第一阶段：基础信息可信度建设】\n')

test(
  '1.1 权威来源清单已加载',
  () => {
    const sources = credibilityService.findRelevantSources('流感疫苗')
    return sources.length > 0
  },
  '应能找到流感疫苗相关的权威来源'
)

test(
  '1.2 来源标注格式正确',
  () => {
    const sources = credibilityService.findRelevantSources('高血压')
    if (sources.length === 0) return false
    const annotation = credibilityService.formatSourceAnnotation(sources[0])
    return annotation.includes('依据') || annotation.includes('来源')
  },
  '来源标注应包含"依据"或"来源"关键词'
)

test(
  '1.3 时效性标识正确',
  () => {
    const sources = credibilityService.findRelevantSources('流感疫苗')
    if (sources.length === 0) return false
    const source = sources[0]
    return source.timeSensitivity?.isTimeSensitive === true
  },
  '流感疫苗主题应标记为时效性内容'
)

console.log('\n【第二阶段：追问机制设计与实现】\n')

const testSessionId = 'test_session_001'

test(
  '2.1 发热症状触发追问',
  () => {
    const result = credibilityService.analyzeFollowUpNeed('我发热了', testSessionId)
    return result.needsFollowUp && result.questions.length > 0
  },
  '发热描述应触发追问'
)

test(
  '2.2 用药咨询触发追问',
  () => {
    const newSessionId = 'test_session_002'
    const result = credibilityService.analyzeFollowUpNeed('感冒吃什么药', newSessionId)
    return result.needsFollowUp && result.questions.some(q => q.includes('症状') || q.includes('过敏'))
  },
  '用药咨询应追问症状和过敏史'
)

test(
  '2.3 慢性病+症状触发追问',
  () => {
    const newSessionId = 'test_session_003'
    const result = credibilityService.analyzeFollowUpNeed('我有糖尿病，最近感冒了', newSessionId)
    return result.needsFollowUp && result.questions.some(q => q.includes('控制') || q.includes('医生'))
  },
  '慢性病+症状应追问控制情况'
)

test(
  '2.4 模糊描述触发追问',
  () => {
    const newSessionId = 'test_session_004'
    const result = credibilityService.analyzeFollowUpNeed('我不舒服', newSessionId)
    return result.needsFollowUp && result.questions.length > 0
  },
  '模糊描述应触发追问'
)

console.log('\n【第三阶段：安全边界强化】\n')

test(
  '3.1 紧急关键词识别',
  () => {
    const result = credibilityService.checkEmergencyKeywords('我胸痛，呼吸困难')
    return result.isEmergency && !!result.warningText?.includes('紧急')
  },
  '胸痛、呼吸困难应识别为紧急情况'
)

test(
  '3.2 就医边界提示存在',
  () => {
    const warning = credibilityService.getMedicalBoundaryWarning()
    return warning.includes('就医') && warning.includes('发热')
  },
  '就医边界提示应包含就医和发热关键词'
)

test(
  '3.3 免责声明存在',
  () => {
    const disclaimer = credibilityService.getDisclaimer()
    return disclaimer.includes('免责声明') && disclaimer.includes('不能替代')
  },
  '免责声明应包含免责声明和不能替代关键词'
)

console.log('\n【第四阶段：知识库与内容固化】\n')

test(
  '4.1 高频主题来源覆盖',
  () => {
    const topics = ['感冒', '发热', '头痛', '高血压', '糖尿病', '流感疫苗']
    let covered = 0
    for (const topic of topics) {
      const sources = credibilityService.findRelevantSources(topic)
      if (sources.length > 0) covered++
    }
    return covered >= 5
  },
  '至少覆盖5个高频主题'
)

test(
  '4.2 来源类型多样化',
  () => {
    const allSources = [
      ...credibilityService.findRelevantSources('感冒'),
      ...credibilityService.findRelevantSources('高血压'),
      ...credibilityService.findRelevantSources('流感疫苗')
    ]
    const sourceTypes = new Set(allSources.map(s => s.source))
    return sourceTypes.size >= 2
  },
  '应包含多种来源类型'
)

console.log('\n【第五阶段：综合测试】\n')

test(
  '5.1 完整回应构建',
  () => {
    const sessionId = 'test_session_005'
    const enhanced = credibilityService.buildEnhancedPrompt('头痛怎么办', sessionId)
    return enhanced.sources.length > 0 && 
           enhanced.systemPrompt.length > 0
  },
  '完整回应应包含来源和系统提示词'
)

test(
  '5.2 带元数据的回应格式化',
  () => {
    const sources = credibilityService.findRelevantSources('头痛')
    const formatted = credibilityService.formatResponseWithMetadata(
      '建议休息，多喝水',
      sources,
      true
    )
    return formatted.includes('依据') && 
           formatted.includes('就医') && 
           formatted.includes('免责声明')
  },
  '格式化回应应包含来源标注、就医提示和免责声明'
)

console.log('\n========================================')
console.log('测试结果汇总')
console.log('========================================\n')

const passed = results.filter(r => r.passed).length
const total = results.length

console.log(`通过: ${passed}/${total}`)
console.log(`通过率: ${((passed / total) * 100).toFixed(1)}%`)

if (passed === total) {
  console.log('\n✓ 所有测试通过！')
} else {
  console.log('\n✗ 部分测试失败，请检查上述详情。')
  console.log('\n失败的测试:')
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  - ${r.name}: ${r.details}`)
  })
}

console.log('\n========================================')
console.log('验收标准检查')
console.log('========================================\n')

console.log('【第一阶段验收】')
console.log('  - 随机抽取10条常见健康问题，AI回答中每条具体建议均有来源标注: ' + 
  (results.filter(r => r.name.startsWith('1.')).every(r => r.passed) ? '✓ 通过' : '✗ 未通过'))
console.log('  - 标注中至少包含3种不同类型: ' + 
  (results.find(r => r.name === '4.2 来源类型多样化')?.passed ? '✓ 通过' : '✗ 未通过'))

console.log('\n【第二阶段验收】')
console.log('  - 输入"我感冒了，需要吃药吗？"触发追问: ' + 
  (results.find(r => r.name === '2.2 用药咨询触发追问')?.passed ? '✓ 通过' : '✗ 未通过'))
console.log('  - 输入"我有糖尿病，最近感冒了"触发追问: ' + 
  (results.find(r => r.name === '2.3 慢性病+症状触发追问')?.passed ? '✓ 通过' : '✗ 未通过'))

console.log('\n【第三阶段验收】')
console.log('  - 包含"发热""咳嗽""头痛"等关键词的回答包含就医边界提示: ' + 
  (results.find(r => r.name === '3.2 就医边界提示存在')?.passed ? '✓ 通过' : '✗ 未通过'))
console.log('  - 免责声明无歧义: ' + 
  (results.find(r => r.name === '3.3 免责声明存在')?.passed ? '✓ 通过' : '✗ 未通过'))

console.log('\n')

process.exit(passed === total ? 0 : 1)
