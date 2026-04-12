import { PrismaClient } from '@prisma/client'
import { pipeline, env } from '@xenova/transformers'

env.allowRemoteModels = true
env.allowLocalModels = false
env.remoteHost = 'https://hf-mirror.com'

const prisma = new PrismaClient()

let embedder: Awaited<ReturnType<typeof pipeline>> | null = null

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline(
      'feature-extraction',
      'Xenova/bge-base-zh-v1.5',
      { quantized: true }
    )
  }
  return embedder!
}

async function generateEmbedding(text: string): Promise<number[]> {
  const model = await getEmbedder()
  const truncated = text.slice(0, 512)
  const output = await model(truncated, { pooling: 'mean', normalize: true } as any) as { data: Float32Array }
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

async function testSelfSimilarity() {
  console.log('=== 自相似度测试 ===\n')
  
  try {
    const sample = await prisma.$queryRaw`
      SELECT 
        id,
        content,
        embedding::text as embedding_text
      FROM document_chunks
      WHERE embedding IS NOT NULL
      LIMIT 1
    ` as any[]
    
    if (sample.length === 0) {
      console.log('没有找到数据')
      return
    }

    const content = sample[0].content
    const embText = sample[0].embedding_text
    const storedEmbedding = embText.replace(/[\[\]]/g, '').split(',').map((v: string) => parseFloat(v.trim()))
    
    console.log('原始内容:')
    console.log(`  ${content.substring(0, 150)}...`)
    console.log(`\n数据库向量前5个值: [${storedEmbedding.slice(0, 5).map((v: number) => v.toFixed(4)).join(', ')}]`)

    console.log('\n重新生成向量...')
    const newEmbedding = await generateEmbedding(content)
    console.log(`新生成向量前5个值: [${newEmbedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`)

    const similarity = cosineSimilarity(storedEmbedding, newEmbedding)
    console.log(`\n自相似度: ${(similarity * 100).toFixed(1)}%`)
    
    if (similarity > 0.99) {
      console.log('✅ 向量生成一致！模型匹配正确')
    } else if (similarity > 0.9) {
      console.log('⚠️ 向量相似但不完全一致，可能是量化差异')
    } else {
      console.log('❌ 向量不一致！数据可能用不同模型生成')
    }

    console.log('\n\n=== 测试用新向量搜索 ===')
    const vectorStr = `[${newEmbedding.join(',')}]`
    const result = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        content,
        1 - (embedding <=> $1::vector) as similarity
      FROM document_chunks
      ORDER BY embedding <=> $1::vector
      LIMIT 3`,
      vectorStr
    )
    
    result.forEach((row, i) => {
      const sim = (row.similarity * 100).toFixed(1)
      console.log(`  [${i + 1}] 相似度: ${sim}%`)
      console.log(`      内容: ${row.content?.substring(0, 80)}...`)
    })

  } catch (error) {
    console.error('测试出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSelfSimilarity()
