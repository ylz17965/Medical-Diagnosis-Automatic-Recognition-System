import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkEmbeddingStatus() {
  console.log('=== 向量生成状态检查 ===\n')
  
  try {
    const totalChunks = await prisma.$queryRaw`
      SELECT COUNT(*) as total FROM document_chunks
    ` as any[]
    
    const withEmbedding = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks WHERE embedding IS NOT NULL
    ` as any[]
    
    const withoutEmbedding = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks WHERE embedding IS NULL
    ` as any[]
    
    console.log(`总文本块: ${totalChunks[0].total}`)
    console.log(`已有向量: ${withEmbedding[0].count}`)
    console.log(`无向量: ${withoutEmbedding[0].count}`)
    
    if (withEmbedding[0].count === totalChunks[0].total) {
      console.log('\n✅ 所有向量已生成完成！')
    } else {
      console.log(`\n⏳ 还有 ${withoutEmbedding[0].count} 条未完成`)
    }
    
  } catch (error) {
    console.error('检查出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkEmbeddingStatus()
