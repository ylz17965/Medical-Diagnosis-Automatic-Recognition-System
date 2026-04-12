import { credibilityService } from '../services/credibility.service.js'

console.log('\n========================================')
console.log('AI健康助手 - 可信度服务功能测试')
console.log('========================================\n')

const testCases = [
  { input: '我发热了', sessionId: 'test_1' },
  { input: '头痛怎么办', sessionId: 'test_2' },
  { input: '高血压怎么吃', sessionId: 'test_3' },
  { input: '流感疫苗什么时候打', sessionId: 'test_4' },
  { input: '我胸痛呼吸困难', sessionId: 'test_5' },
  { input: '感冒吃什么药', sessionId: 'test_6' },
  { input: '我有糖尿病，最近感冒了', sessionId: 'test_7' },
]

for (const testCase of testCases) {
  console.log(`\n【测试输入】"${testCase.input}"`)
  console.log('-'.repeat(50))
  
  const result = credibilityService.buildEnhancedPrompt(testCase.input, testCase.sessionId)
  
  if (result.isEmergency) {
    console.log('🚨 紧急情况识别: 是')
    console.log(`   警告: ${result.emergencyWarning}`)
  }
  
  if (result.needsFollowUp) {
    console.log('❓ 需要追问: 是')
    console.log(`   追问问题:`)
    result.followUpQuestions.forEach((q, i) => {
      console.log(`   ${i + 1}. ${q}`)
    })
  }
  
  if (result.sources.length > 0) {
    console.log('📚 相关来源:')
    result.sources.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.topic}: ${s.citation}`)
      if (s.timeSensitivity?.isTimeSensitive) {
        console.log(`      ⏰ 时效性提醒: ${s.timeSensitivity.reminderText}`)
      }
    })
  }
  
  console.log('')
}

console.log('\n========================================')
console.log('测试完成')
console.log('========================================\n')
