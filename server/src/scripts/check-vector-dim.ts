import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.$queryRaw`SELECT embedding::text FROM document_chunks LIMIT 1`
  console.log('Result:', result)
  
  if (Array.isArray(result) && result.length > 0) {
    const embeddingStr = result[0].embedding
    console.log('Embedding string sample:', embeddingStr.substring(0, 200))
    
    const values = embeddingStr.replace(/[\[\]]/g, '').split(',').map((v: string) => parseFloat(v.trim()))
    console.log('Vector dimension:', values.length)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
