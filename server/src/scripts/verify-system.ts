import { PrismaClient } from '@prisma/client'
import { RAGService } from '../services/rag.service.js'
import { RedisCacheService } from '../services/redis-cache.service.js'
import { listAgents, routeToAgent, loadAgent } from '../services/agent.service.js'

const prisma = new PrismaClient()
const redisCache = new RedisCacheService()

async function verify() {
  console.log('========================================')
  console.log('  系统验证脚本 - Agent & 向量数据库')
  console.log('========================================\n')

  try {
    console.log('【1. 向量数据库验证】')
    console.log('--------------------------')
    
    const ragService = new RAGService(prisma, redisCache)
    const stats = await ragService.getDocumentStats()
    
    console.log(`✅ 文档总数: ${stats.totalDocuments}`)
    console.log(`✅ 向量块总数: ${stats.totalChunks}`)
    console.log(`✅ 分类: ${stats.categories.join(', ')}`)
    
    console.log('\n【2. 向量检索测试】')
    console.log('--------------------------')
    
    const testQueries = ['肺癌早期症状', '高血压用药', '糖尿病饮食']
    
    for (const query of testQueries) {
      console.log(`\n查询: "${query}"`)
      try {
        const results = await ragService.searchSimilar({ query, topK: 3 })
        if (results.length > 0) {
          console.log(`  ✅ 找到 ${results.length} 条相关结果`)
          console.log(`  最高相似度: ${(results[0].score * 100).toFixed(1)}%`)
          console.log(`  来源: ${results[0].source}`)
        } else {
          console.log('  ⚠️ 未找到相关结果')
        }
      } catch (error) {
        console.log(`  ❌ 检索失败: ${error}`)
      }
    }

    console.log('\n\n【3. Agent 验证】')
    console.log('--------------------------')
    
    const agents = listAgents()
    console.log(`✅ 已加载 ${agents.length} 个 Agent`)
    
    console.log('\nAgent 列表:')
    agents.forEach((agent, i) => {
      console.log(`  ${i + 1}. ${agent.emoji} ${agent.name}`)
      console.log(`     ID: ${agent.id}`)
    })

    console.log('\n\n【4. Agent 路由测试】')
    console.log('--------------------------')
    
    const testCases = [
      { query: '我有一个6mm肺结节，需要怎么随访？', expected: 'lung-cancer' },
      { query: '我血压150/95，需要吃药吗？', expected: 'hypertension' },
      { query: '最近总是头晕失眠，中医怎么看？', expected: 'tcm' },
      { query: '帮我优化数据库查询性能', expected: 'database' },
      { query: '这个Vue组件怎么写？', expected: 'frontend' },
    ]

    for (const test of testCases) {
      console.log(`\n查询: "${test.query}"`)
      const routeResult = routeToAgent(test.query)
      const agent = loadAgent(routeResult.agentId)
      if (agent) {
        const isCorrect = routeResult.agentId.includes(test.expected)
        console.log(`  路由到: ${agent.emoji} ${agent.name}`)
        console.log(`  置信度: ${(routeResult.confidence * 100).toFixed(0)}%`)
        console.log(`  ${isCorrect ? '✅' : '⚠️'} ${isCorrect ? '路由正确' : `预期包含: ${test.expected}`}`)
      } else {
        console.log('  ⚠️ 未匹配到特定Agent')
      }
    }

    console.log('\n\n========================================')
    console.log('  验证完成！')
    console.log('========================================')
    
    console.log('\n【总结】')
    console.log('--------------------------')
    console.log(`向量数据库: ${stats.totalChunks > 0 ? '✅ 正常' : '❌ 无数据'}`)
    console.log(`Agent 系统: ${agents.length > 0 ? '✅ 正常' : '❌ 无Agent'}`)
    console.log('\n提示: Agent 目前未集成到聊天流程中，需要进一步开发集成。')

  } catch (error) {
    console.error('验证失败:', error)
  } finally {
    await redisCache.disconnect()
    await prisma.$disconnect()
  }
}

verify()
