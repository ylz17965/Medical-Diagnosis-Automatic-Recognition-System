import { bgeM3Client } from '../services/bge-m3-client.service.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const query = '如何预防感冒'
  console.log('Query:', query)
  
  const embedding = await bgeM3Client.generateEmbedding(query)
  console.log('Embedding dimension:', embedding.embedding.length)
  
  const dimension = 1024
  const topK = 5
  
  const sql = `
    SELECT 
      dc.content,
      kd.source,
      kd.title,
      1 - (dc.embedding <=> $1::vector(${dimension})) as score
    FROM document_chunks dc
    JOIN knowledge_documents kd ON dc."documentId" = kd.id
    ORDER BY dc.embedding <=> $1::vector(${dimension})
    LIMIT $2
  `
  
  const queryVector = `[${embedding.embedding.join(',')}]`
  const results = await prisma.$queryRawUnsafe(sql, queryVector, topK)
  
  console.log('\n=== RAG Results with Scores ===')
  console.log('Similarity threshold: 0.5')
  console.log('')
  
  for (const r of results) {
    const score = Number(r.score)
    const passes = score >= 0.5 ? '✅ PASS' : '❌ FAIL'
    console.log(`Score: ${score.toFixed(4)} ${passes}`)
    console.log(`  Source: ${r.source}`)
    console.log(`  Content: ${r.content.substring(0, 80)}...`)
    console.log('')
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
