import { PrismaClient } from '@prisma/client'
import { RAGService } from '../services/rag.service.js'
import { RedisCacheService } from '../services/redis-cache.service.js'

const prisma = new PrismaClient()
const redisCache = new RedisCacheService()

async function checkKnowledgeBase() {
  console.log('========================================')
  console.log('  知识库数据检查')
  console.log('========================================\n')

  try {
    await redisCache.connect()
    const ragService = new RAGService(prisma, redisCache)
    
    console.log('【1. 数据库统计】')
    const stats = await ragService.getDocumentStats()
    console.log(`文档总数: ${stats.totalDocuments}`)
    console.log(`向量块总数: ${stats.totalChunks}`)
    console.log(`分类: ${stats.categories.join(', ')}`)
    
    console.log('\n【2. 向量检索测试】')
    const testQueries = [
      '呼吸道感染预防',
      '感冒预防方法',
      '流感疫苗接种',
      '肺癌筛查',
      '高血压治疗'
    ]
    
    for (const query of testQueries) {
      console.log(`\n查询: "${query}"`)
      try {
        const results = await ragService.searchSimilar({ query, topK: 3 })
        if (results.length > 0) {
          console.log(`  找到 ${results.length} 条相关结果`)
          results.forEach((r: { source: string; content: string; score: number }, i: number) => {
            console.log(`  [${i + 1}] 来源: ${r.source}`)
            console.log(`      内容: ${r.content.substring(0, 100)}...`)
            console.log(`      相似度: ${(r.score * 100).toFixed(1)}%`)
          })
        } else {
          console.log('  未找到相关结果')
        }
      } catch (error) {
        console.log(`  检索失败: ${error}`)
      }
    }
    
    console.log('\n【3. 最近添加的文档】')
    const recentDocs = await prisma.knowledgeDocument.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, source: true, createdAt: true }
    })
    recentDocs.forEach((doc: { id: string; title: string | null; source: string; createdAt: Date }, i: number) => {
      console.log(`  [${i + 1}] ${doc.title || doc.source}`)
      console.log(`      创建时间: ${doc.createdAt}`)
    })

  } catch (error) {
    console.error('检查失败:', error)
  } finally {
    await redisCache.disconnect()
    await prisma.$disconnect()
  }
}

checkKnowledgeBase()
