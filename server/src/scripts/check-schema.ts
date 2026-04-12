import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSchema() {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'document_chunks'
      ORDER BY ordinal_position
    `
    console.log('document_chunks 表结构:')
    console.log(JSON.stringify(result, null, 2))
    
    const kdResult = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'knowledge_documents'
      ORDER BY ordinal_position
    `
    console.log('\nknowledge_documents 表结构:')
    console.log(JSON.stringify(kdResult, null, 2))
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSchema()
