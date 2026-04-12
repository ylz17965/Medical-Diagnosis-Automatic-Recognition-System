import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const docCount = await prisma.knowledgeDocument.count()
  const chunkCount = await prisma.documentChunk.count()

  console.log('=== 数据库中的数据 ===')
  console.log(`知识文档数量: ${docCount}`)
  console.log(`文档片段数量: ${chunkCount}`)

  const sample = await prisma.knowledgeDocument.findFirst({
    select: {
      id: true,
      title: true,
      source: true,
    }
  })
  console.log('\n示例文档:')
  console.log(sample)
}

main().catch(console.error).finally(() => prisma.$disconnect())
