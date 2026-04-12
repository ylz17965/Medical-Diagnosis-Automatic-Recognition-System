import { PrismaClient } from '@prisma/client'
import { config } from './src/config/index.js'

const EMBEDDING_API = 'https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings'
const BATCH_SIZE = 10
const DELAY_BETWEEN_BATCHES = 200

interface EmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>
  usage: { total_tokens: number }
}

interface ChunkRow {
  id: string
  content: string
}

async function generateEmbeddings(texts: string[], apiKey: string): Promise<number[][]> {
  const response = await fetch(EMBEDDING_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-v3',
      input: texts,
      dimensions: 768,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Embedding API failed: ${response.status} ${errorText}`)
  }

  const data = (await response.json()) as EmbeddingResponse
  return data.data.sort((a, b) => a.index - b.index).map(d => d.embedding)
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const prisma = new PrismaClient()
  const apiKey = config.qwen.apiKey

  if (!apiKey) {
    console.error('❌ QWEN_API_KEY 未配置')
    process.exit(1)
  }

  console.log('🔍 向量嵌入生成工具')
  console.log('（支持断点续传 - 可随时停止，下次自动继续）')
  console.log('=' .repeat(50))

  const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM document_chunks WHERE embedding IS NULL
  `
  const totalChunks = Number(countResult[0].count)

  console.log(`📊 待处理分块数: ${totalChunks}`)

  if (totalChunks === 0) {
    console.log('✅ 所有分块已有嵌入，无需处理')
    await prisma.$disconnect()
    return
  }

  let processed = 0
  let consecutiveErrors = 0
  const startTime = Date.now()

  while (true) {
    const chunks = await prisma.$queryRaw<ChunkRow[]>`
      SELECT id, content FROM document_chunks 
      WHERE embedding IS NULL 
      LIMIT ${BATCH_SIZE}
    `

    if (chunks.length === 0) break

    try {
      const texts = chunks.map(c => c.content.slice(0, 8000))
      const embeddings = await generateEmbeddings(texts, apiKey)

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const embedding = embeddings[i]
        
        await prisma.$executeRaw`
          UPDATE document_chunks 
          SET embedding = ${`[${embedding.join(',')}]`}::vector(768)
          WHERE id = ${chunk.id}
        `
      }

      processed += chunks.length
      consecutiveErrors = 0
      
      const elapsed = Math.round((Date.now() - startTime) / 1000)
      const rate = elapsed > 0 ? processed / elapsed : 0
      const remaining = rate > 0 ? Math.round((totalChunks - processed) / rate) : 0

      const percent = ((processed / totalChunks) * 100).toFixed(1)
      process.stdout.write(
        `\r✅ 进度: ${processed}/${totalChunks} (${percent}%) | ` +
        `速度: ${rate.toFixed(1)}/s | ` +
        `剩余: ${remaining}s   `
      )

      await sleep(DELAY_BETWEEN_BATCHES)
    } catch (error: any) {
      consecutiveErrors++
      console.error(`\n❌ 错误:`, error.message || error)
      
      // 如果是 tokens 不足或余额不足，直接退出
      const errorStr = String(error)
      if (errorStr.includes('Insufficient Balance') || 
          errorStr.includes('tokens') ||
          errorStr.includes('quota') ||
          errorStr.includes('limit')) {
        console.log('\n⚠️  检测到 API 限制（tokens 不足或余额不足）')
        console.log('💡 已处理的数据已保存，下次运行会自动继续')
        console.log('⏹️  任务暂停，请充值后重新运行脚本')
        break
      }
      
      // 连续错误 3 次也退出
      if (consecutiveErrors >= 3) {
        console.log('\n⚠️  连续多次错误，任务暂停')
        console.log('💡 已处理的数据已保存，下次运行会自动继续')
        break
      }
      
      await sleep(2000)
    }
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000)
  console.log(`\n\n🎉 本次运行完成！`)
  console.log(`   本次处理: ${processed} 个分块`)
  console.log(`   剩余待处理: ${totalChunks - processed} 个分块`)
  console.log(`   耗时: ${Math.floor(totalTime / 60)}分${totalTime % 60}秒`)
  console.log(`\n💡 提示: 下次运行 [36mnpx tsx generate-embeddings.ts[0m 会自动继续`)

  await prisma.$disconnect()
}

main().catch(console.error)
