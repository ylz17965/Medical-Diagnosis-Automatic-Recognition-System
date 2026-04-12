import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixVectorDimension() {
  console.log('修复向量维度...')
  
  try {
    // 先清除现有向量
    await prisma.$executeRaw`UPDATE document_chunks SET embedding = NULL`
    console.log('已清除现有向量')
    
    // 删除旧列
    await prisma.$executeRaw`ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding`
    console.log('已删除旧向量列')
    
    // 创建新的 1024 维向量列
    await prisma.$executeRaw`ALTER TABLE document_chunks ADD COLUMN embedding vector(1024)`
    console.log('已创建 1024 维向量列')
    
    // 创建向量索引
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
      ON document_chunks 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `
    console.log('已创建向量索引')
    
    console.log('\n完成！现在可以运行 python generate_embeddings_bge_m3.py')
    
  } catch (error) {
    console.error('错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixVectorDimension()
