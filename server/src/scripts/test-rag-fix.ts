import { PrismaClient } from '@prisma/client'
import { LocalEmbeddingService } from '../services/local-embedding.service.js'

const prisma = new PrismaClient()

async function testRAGFix() {
  const embeddingService = new LocalEmbeddingService()

  console.log('=== RAG修复验证测试 ===\n')
  
  try {
    const dataCheck = await prisma.$queryRaw`
      SELECT COUNT(*) as total_chunks FROM document_chunks
    ` as any[]
    console.log(`总文本块: ${dataCheck[0].total_chunks}`)

    const dimCheck = await prisma.$queryRaw`
      SELECT 
        vector_dims(embedding) as dimension,
        COUNT(*) as count
      FROM document_chunks 
      WHERE embedding IS NOT NULL
      GROUP BY vector_dims(embedding)
    ` as any[]
    console.log('\n向量维度分布:')
    dimCheck.forEach(d => {
      console.log(`  - ${d.dimension}维: ${d.count}条`)
    })

    const testQueries = [
      '头痛怎么治疗',
      '肺癌早期症状',
    ]

    for (const query of testQueries) {
      console.log(`\n\n测试查询: "${query}"`)
      console.log('-'.repeat(50))

      console.log('  生成查询向量中...')
      const { embedding } = await embeddingService.generateEmbedding(query)
      console.log(`  向量维度: ${embedding.length}`)

      const vectorStr = `[${embedding.join(',')}]`
      
      const result = await prisma.$queryRawUnsafe<any[]>(
        `SELECT 
          dc.content,
          dc.metadata->>'title' as title,
          1 - (dc.embedding <=> $1::vector) as similarity
        FROM document_chunks dc
        WHERE dc.embedding IS NOT NULL
        ORDER BY dc.embedding <=> $1::vector
        LIMIT 5`,
        vectorStr
      )

      console.log(`  找到 ${result.length} 条相关结果:\n`)
      
      result.forEach((row, i) => {
        const content = row.content?.substring(0, 80) || '无内容'
        const similarity = (row.similarity * 100).toFixed(1)
        console.log(`  [${i + 1}] 相似度: ${similarity}%`)
        console.log(`      内容: ${content}...`)
      })
    }

    console.log('\n\n=== 测试完成 ===')

  } catch (error) {
    console.error('测试出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testRAGFix()
