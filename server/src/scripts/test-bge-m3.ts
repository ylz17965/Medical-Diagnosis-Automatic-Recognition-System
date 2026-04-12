import { PrismaClient } from '@prisma/client'
import { pipeline, env } from '@xenova/transformers'

env.allowRemoteModels = true
env.allowLocalModels = false
env.remoteHost = 'https://hf-mirror.com'

const prisma = new PrismaClient()

let embedder: Awaited<ReturnType<typeof pipeline>> | null = null

async function getEmbedder() {
  if (!embedder) {
    console.log('📥 正在加载 BAAI/bge-m3 多语言模型...')
    console.log('   首次加载需下载约 2GB，请耐心等待...')
    
    embedder = await pipeline(
      'feature-extraction',
      'BAAI/bge-m3',
      { quantized: false }
    )
    
    console.log('✅ 模型加载完成！')
  }
  return embedder!
}

async function generateEmbedding(text: string): Promise<number[]> {
  const model = await getEmbedder()
  const truncated = text.slice(0, 8192)
  const output = await model(truncated, { pooling: 'cls', normalize: true } as any) as { data: Float32Array }
  return Array.from(output.data)
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

async function testBgeM3() {
  console.log('=== BGE-M3 多语言模型测试 ===\n')
  
  try {
    console.log('测试跨语言能力...\n')
    
    const testPairs = [
      { chinese: '头痛怎么治疗', english: 'How to treat headache' },
      { chinese: '肺癌早期症状', english: 'Early symptoms of lung cancer' },
      { chinese: '高血压饮食注意事项', english: 'Dietary precautions for hypertension' },
    ]

    for (const pair of testPairs) {
      console.log(`【${pair.chinese}】vs【${pair.english}】`)
      
      const zhEmbedding = await generateEmbedding(pair.chinese)
      const enEmbedding = await generateEmbedding(pair.english)
      
      const similarity = cosineSimilarity(zhEmbedding, enEmbedding)
      console.log(`  跨语言相似度: ${(similarity * 100).toFixed(1)}%`)
      
      if (similarity > 0.8) {
        console.log('  ✅ 优秀 - 跨语言匹配良好')
      } else if (similarity > 0.6) {
        console.log('  ⚠️ 一般 - 跨语言匹配一般')
      } else {
        console.log('  ❌ 较差 - 跨语言匹配不佳')
      }
      console.log('')
    }

    console.log('\n=== 测试英文内容检索 ===')
    
    const query = '头痛怎么治疗'
    console.log(`查询: "${query}"`)
    
    const queryEmbedding = await generateEmbedding(query)
    console.log(`向量维度: ${queryEmbedding.length}`)
    
    const vectorStr = `[${queryEmbedding.join(',')}]`
    
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
    
    console.log(`\n找到 ${result.length} 条结果:\n`)
    
    result.forEach((row, i) => {
      const sim = (row.similarity * 100).toFixed(1)
      const content = row.content?.substring(0, 100) || '无内容'
      console.log(`[${i + 1}] 相似度: ${sim}%`)
      console.log(`    内容: ${content}...`)
      console.log('')
    })

    console.log('\n=== 分析 ===')
    console.log('如果相似度 > 60%，说明 bge-m3 跨语言检索有效')
    console.log('如果相似度 < 40%，说明需要重新生成向量')

  } catch (error) {
    console.error('测试出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testBgeM3()
