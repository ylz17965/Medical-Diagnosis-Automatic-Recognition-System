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

async function testPureTextHeadache() {
  console.log('=== 纯文本头痛内容测试 ===\n')
  
  try {
    const textHeadache = await prisma.$queryRaw`
      SELECT 
        id,
        content,
        embedding::text as embedding_text
      FROM document_chunks
      WHERE (content LIKE '%头痛%' OR content LIKE '%偏头痛%' OR content LIKE '%migraine%')
        AND content NOT LIKE '{%'
        AND content NOT LIKE '[%'
      LIMIT 3
    ` as any[]
    
    console.log(`找到 ${textHeadache.length} 条纯文本头痛内容\n`)

    if (textHeadache.length === 0) {
      console.log('没有找到纯文本头痛内容')
      return
    }

    const queryEmbedding = await generateEmbedding('头痛怎么治疗')
    console.log('查询向量已生成\n')

    for (const sample of textHeadache) {
      const content = sample.content
      const embText = sample.embedding_text
      const storedEmbedding = embText.replace(/[\[\]]/g, '').split(',').map((v: string) => parseFloat(v.trim()))
      
      console.log('内容预览:')
      console.log(`  ${content.substring(0, 150)}...`)
      
      const similarity = cosineSimilarity(storedEmbedding, queryEmbedding)
      console.log(`  与查询"头痛怎么治疗"的相似度: ${(similarity * 100).toFixed(1)}%`)
      console.log('')
    }

    console.log('\n=== 用纯文本头痛内容搜索 ===')
    const firstSample = textHeadache[0]
    const firstEmbedding = firstSample.embedding_text.replace(/[\[\]]/g, '').split(',').map((v: string) => parseFloat(v.trim()))
    const vectorStr = `[${firstEmbedding.join(',')}]`
    
    const result = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        content,
        1 - (embedding <=> $1::vector) as similarity
      FROM document_chunks
      WHERE content NOT LIKE '{%' AND content NOT LIKE '[%'
      ORDER BY embedding <=> $1::vector
      LIMIT 5`,
      vectorStr
    )
    
    result.forEach((row, i) => {
      const sim = (row.similarity * 100).toFixed(1)
      console.log(`  [${i + 1}] 相似度: ${sim}%`)
      console.log(`      内容: ${row.content?.substring(0, 100)}...`)
    })

  } catch (error) {
    console.error('测试出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPureTextHeadache()
