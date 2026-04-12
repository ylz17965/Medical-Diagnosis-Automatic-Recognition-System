import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const samples = await prisma.$queryRaw`
    SELECT 
      dc."documentId",
      dc."chunkIndex",
      LENGTH(dc.content) as len,
      LEFT(dc.content, 50) as preview
    FROM document_chunks dc
    ORDER BY dc."documentId", dc."chunkIndex"
    LIMIT 20
  `
  
  console.log('=== 按文档ID和chunkIndex排序的样本 ===')
  for (const s of samples) {
    console.log(`docId: ${s.documentId?.substring(0, 8)}..., chunkIndex: ${s.chunkIndex}, len: ${s.len}`)
  }
  
  const docStats = await prisma.$queryRaw`
    SELECT 
      "documentId",
      COUNT(*) as chunk_count
    FROM document_chunks
    GROUP BY "documentId"
    ORDER BY chunk_count DESC
    LIMIT 10
  `
  
  console.log('\n=== 每个文档的chunk数量 ===')
  for (const s of docStats) {
    console.log(`docId: ${s.documentId?.substring(0, 20)}..., chunks: ${s.chunk_count}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
