import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  
  console.log('🗑️  清空现有嵌入向量...')
  
  const result = await prisma.$executeRaw`
    UPDATE document_chunks SET embedding = NULL
  `
  
  const count = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM document_chunks WHERE embedding IS NULL
  `
  
  console.log(`✅ 已清空，待处理: ${Number(count[0].count)} 个分块`)
  
  await prisma.$disconnect()
}

main().catch(console.error)
