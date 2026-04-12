import { PrismaClient } from '@prisma/client'
import { pipeline, env } from '@xenova/transformers'

env.allowRemoteModels = true
env.allowLocalModels = false
env.remoteHost = 'https://hf-mirror.com'

const prisma = new PrismaClient()

let embedder: Awaited<ReturnType<typeof pipeline>> | null = null

async function getEmbedder() {
  if (!embedder) {
    console.log('📥 正在加载本地嵌入模型...')
    console.log('   模型: Xenova/bge-base-zh-v1.5 (量化版本)')
    
    embedder = await pipeline(
      'feature-extraction',
      'Xenova/bge-base-zh-v1.5',
      { quantized: true }
    )
    
    console.log('✅ 模型加载完成！')
  }
  return embedder!
}

async function generateEmbedding(text: string): Promise<number[]> {
  const model = await getEmbedder()
  const truncated = text.slice(0, 512)
  const output = await model(truncated, { pooling: 'mean', normalize: true } as any) as { data: Float32Array }
  return Array.from(output.data)
}

async function testExactMatch() {
  console.log('=== 使用与数据生成完全相同的代码测试 ===\n')
  
  try {
    const testQueries = [
      '头痛怎么治疗',
      '肺癌早期症状',
    ]

    for (const query of testQueries) {
      console.log(`\n测试查询: "${query}"`)
      console.log('-'.repeat(50))

      const embedding = await generateEmbedding(query)
      console.log(`向量维度: ${embedding.length}`)
      console.log(`向量前5个值: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`)

      const vectorStr = `[${embedding.join(',')}]`
      
      const result = await prisma.$queryRawUnsafe<any[]>(
        `SELECT 
          content,
          1 - (embedding <=> $1::vector) as similarity
        FROM document_chunks
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT 5`,
        vectorStr
      )

      console.log(`\n向量搜索结果:`)
      result.forEach((row, i) => {
        const sim = (row.similarity * 100).toFixed(1)
        const content = row.content?.substring(0, 80) || '无内容'
        console.log(`  [${i + 1}] 相似度: ${sim}%`)
        console.log(`      内容: ${content}...`)
      })
    }

    console.log('\n\n检查数据库中的向量样例:')
    const sampleVector = await prisma.$queryRaw`
      SELECT 
        id,
        content,
        embedding::text as embedding_text
      FROM document_chunks
      WHERE embedding IS NOT NULL
      LIMIT 1
    ` as any[]
    
    if (sampleVector.length > 0) {
      const embText = sampleVector[0].embedding_text
      const embValues = embText.replace(/[\[\]]/g, '').split(',').map((v: string) => parseFloat(v.trim()))
      console.log(`  数据库向量维度: ${embValues.length}`)
      console.log(`  数据库向量前5个值: [${embValues.slice(0, 5).map((v: number) => v.toFixed(4)).join(', ')}]`)
      console.log(`  内容: ${sampleVector[0].content?.substring(0, 80)}...`)
    }

  } catch (error) {
    console.error('测试出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testExactMatch()
