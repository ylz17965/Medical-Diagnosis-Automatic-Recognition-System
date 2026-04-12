import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const stats = await prisma.$queryRaw`
    SELECT 
      MIN(LENGTH(content)) as min_len,
      MAX(LENGTH(content)) as max_len,
      AVG(LENGTH(content))::int as avg_len,
      COUNT(*) as total
    FROM document_chunks
  `
  
  console.log('=== 文本块长度统计 ===')
  console.log(stats)
  
  const samples = await prisma.$queryRaw`
    SELECT 
      LENGTH(content) as len,
      LEFT(content, 100) as preview
    FROM document_chunks
    ORDER BY LENGTH(content) DESC
    LIMIT 5
  `
  
  console.log('\n=== 最长的5个文本块 ===')
  for (const s of samples) {
    console.log(`长度: ${s.len}, 预览: ${s.preview}...`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
