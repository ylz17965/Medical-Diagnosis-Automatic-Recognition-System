import { bgeM3Client } from '../services/bge-m3-client.service.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Testing RAG Search ===')
  
  const query = '头痛应该怎么办'
  console.log('Query:', query)
  
  const embedding = await bgeM3Client.generateEmbedding(query)
  console.log('Embedding dimension:', embedding.embedding.length)
  console.log('Embedding sample:', embedding.embedding.slice(0, 5))
  
  const dimension = 1024
  const topK = 5
  
  const sql = `
    SELECT 
      dc.content,
      kd.source,
      kd.title,
      1 - (dc.embedding <=> $1::vector(${dimension})) as score,
      dc.metadata
    FROM document_chunks dc
    JOIN knowledge_documents kd ON dc."documentId" = kd.id
    ORDER BY dc.embedding <=> $1::vector(${dimension})
    LIMIT $2
  `
  
  const queryVector = `[${embedding.embedding.join(',')}]`
  const results = await prisma.$queryRawUnsafe(sql, queryVector, topK)
  
  console.log('\n=== RAG Results ===')
  console.log('Total results:', results.length)
  
  for (const r of results) {
    console.log(`\n--- Source: ${r.source} ---`)
    console.log(`Title: ${r.title}`)
    console.log(`Score: ${r.score}`)
    console.log(`Content: ${r.content.substring(0, 200)}...`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
