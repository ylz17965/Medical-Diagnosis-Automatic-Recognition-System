import { PrismaClient } from '@prisma/client'
import { pipeline, env } from '@xenova/transformers'

env.allowRemoteModels = true
env.allowLocalModels = false
env.remoteHost = 'https://hf-mirror.com'

const BATCH_SIZE = 3
const DELAY_BETWEEN_BATCHES = 200

interface ChunkRow {
  id: string
  content: string
}

let embedder: Awaited<ReturnType<typeof pipeline>> | null = null

async function getEmbedder() {
  if (!embedder) {
    console.log('📥 正在加载多语言嵌入模型...')
    console.log('   模型: gte-multilingual-base (768维)')
    console.log('   支持: 100+ 语言（中英文跨语言检索）')
    console.log('   首次加载需下载约 500MB，请耐心等待...')
    
    embedder = await pipeline(
      'feature-extraction',
      'onnx-community/gte-multilingual-base',
      { quantized: true }
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

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const prisma = new PrismaClient()

  console.log('🔄 多语言向量生成工具')
  console.log('   解决中英文跨语言检索问题')
  console.log('='.repeat(50))

  const args = process.argv.slice(2)
  const shouldReset = args.includes('--reset')

  if (shouldReset) {
    console.log('\n⚠️  重置模式: 清除现有向量...')
    await prisma.$executeRaw`UPDATE document_chunks SET embedding = NULL`
    console.log('✅ 现有向量已清除')
  }

  const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM document_chunks WHERE embedding IS NULL
  `
  const totalChunks = Number(countResult[0].count)

  console.log(`\n📊 待处理分块数: ${totalChunks}`)

  if (totalChunks === 0) {
    console.log('✅ 所有分块已有嵌入，无需处理')
    console.log('   如需重新生成，请使用: npx tsx generate-embeddings-m3.ts --reset')
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
      for (const chunk of chunks) {
        const embedding = await generateEmbedding(chunk.content)
        
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
        `速度: ${rate.toFixed(2)}/s | ` +
        `剩余: ${Math.floor(remaining/60)}分${remaining%60}秒   `
      )

      await sleep(DELAY_BETWEEN_BATCHES)
    } catch (error: any) {
      errors += chunks.length
      console.error(`\n❌ 错误:`, error.message || error)
      
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
  console.log(`\n💡 提示: 下次运行 \x1b[36mnpx tsx generate-embeddings-m3.ts\x1b[0m 会自动继续`)

  await prisma.$disconnect()
}

main().catch(console.error)
