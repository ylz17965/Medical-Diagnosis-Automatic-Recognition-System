import { PrismaClient } from '@prisma/client'
import { pipeline, env } from '@xenova/transformers'

// 使用 HuggingFace 镜像（国内可访问）
env.allowRemoteModels = true
env.allowLocalModels = false
env.remoteHost = 'https://hf-mirror.com'  // 国内镜像

const BATCH_SIZE = 5  // 本地模型 batch 要小一些
const DELAY_BETWEEN_BATCHES = 100

interface ChunkRow {
  id: string
  content: string
}

type EmbedderPipeline = Awaited<ReturnType<typeof pipeline>>

let embedder: EmbedderPipeline | null = null

async function getEmbedder(): Promise<EmbedderPipeline> {
  if (!embedder) {
    console.log('📥 正在加载本地嵌入模型...')
    console.log('   模型: Xenova/bge-base-zh-v1.5 (约 400MB, 768维)')
    console.log('   首次加载需要下载，请耐心等待...')
    
    embedder = await pipeline(
      'feature-extraction',
      'Xenova/bge-base-zh-v1.5',
      { quantized: true }  // 使用量化版本，更快更小
    )
    
    console.log('✅ 模型加载完成！')
  }
  return embedder!
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const model = await getEmbedder()
  
  const results: number[][] = []
  
  for (const text of texts) {
    const truncated = text.slice(0, 512)  // 本地模型输入长度限制
    const output = await model(truncated, { pooling: 'mean', normalize: true } as any) as { data: Float32Array }
    results.push(Array.from(output.data))
  }
  
  return results
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const prisma = new PrismaClient()

  console.log('🔍 本地向量嵌入生成工具')
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
  let errors = 0
  const startTime = Date.now()

  while (true) {
    const chunks = await prisma.$queryRaw<ChunkRow[]>`
      SELECT id, content FROM document_chunks 
      WHERE embedding IS NULL 
      LIMIT ${BATCH_SIZE}
    `

    if (chunks.length === 0) break

    try {
      const texts = chunks.map(c => c.content)
      const embeddings = await generateEmbeddings(texts)

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
      errors += chunks.length
      console.error(`\n❌ 错误:`, error.message || error)
      
      // 连续错误 3 次退出
      if (errors >= BATCH_SIZE * 3) {
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
  console.log(`\n💡 提示: 下次运行 \x1b[36mnpx tsx generate-embeddings-local.ts\x1b[0m 会自动继续`)

  await prisma.$disconnect()
}

main().catch(console.error)
