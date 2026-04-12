import { PrismaClient } from '@prisma/client'
import { LocalEmbeddingService } from '../services/local-embedding.service.js'

const prisma = new PrismaClient()

async function compareSearchMethods() {
  const embeddingService = new LocalEmbeddingService()

  console.log('=== 关键词搜索 vs 向量搜索对比 ===\n')
  
  try {
    console.log('【测试1: 头痛】')
    console.log('-'.repeat(50))
    
    console.log('\n关键词搜索结果:')
    const keywordHeadache = await prisma.$queryRaw`
      SELECT 
        content,
        1 as similarity
      FROM document_chunks
      WHERE content LIKE '%头痛%' OR content LIKE '%偏头痛%'
      LIMIT 3
    ` as any[]
    
    keywordHeadache.forEach((r, i) => {
      console.log(`  [${i + 1}] ${r.content.substring(0, 100)}...`)
    })

    console.log('\n向量搜索结果:')
    const { embedding: emb1 } = await embeddingService.generateEmbedding('头痛怎么治疗')
    const vectorStr1 = `[${emb1.join(',')}]`
    
    const vectorHeadache = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        content,
        1 - (embedding <=> $1::vector) as similarity
      FROM document_chunks
      ORDER BY embedding <=> $1::vector
      LIMIT 3`,
      vectorStr1
    )
    
    vectorHeadache.forEach((r, i) => {
      const sim = (r.similarity * 100).toFixed(1)
      console.log(`  [${i + 1}] 相似度${sim}%: ${r.content.substring(0, 100)}...`)
    })

    console.log('\n\n【测试2: 肺癌】')
    console.log('-'.repeat(50))
    
    console.log('\n关键词搜索结果:')
    const keywordLung = await prisma.$queryRaw`
      SELECT content
      FROM document_chunks
      WHERE content LIKE '%肺癌%' OR content LIKE '%lung cancer%'
      LIMIT 3
    ` as any[]
    
    keywordLung.forEach((r, i) => {
      console.log(`  [${i + 1}] ${r.content.substring(0, 100)}...`)
    })

    console.log('\n向量搜索结果:')
    const { embedding: emb2 } = await embeddingService.generateEmbedding('肺癌早期症状')
    const vectorStr2 = `[${emb2.join(',')}]`
    
    const vectorLung = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        content,
        1 - (embedding <=> $1::vector) as similarity
      FROM document_chunks
      ORDER BY embedding <=> $1::vector
      LIMIT 3`,
      vectorStr2
    )
    
    vectorLung.forEach((r, i) => {
      const sim = (r.similarity * 100).toFixed(1)
      console.log(`  [${i + 1}] 相似度${sim}%: ${r.content.substring(0, 100)}...`)
    })

    console.log('\n\n=== 分析结论 ===')
    console.log('如果关键词搜索能找到相关内容，但向量搜索不能，说明：')
    console.log('1. 向量可能不是用相同模型生成的')
    console.log('2. 或者数据导入时向量计算有问题')

  } catch (error) {
    console.error('测试出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

compareSearchMethods()
