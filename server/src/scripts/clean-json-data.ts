import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanJsonData() {
  console.log('=== 清理JSON数据 ===\n')
  
  try {
    const beforeCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks
    ` as any[]
    console.log(`清理前总数: ${beforeCount[0].count}条`)

    const jsonCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks
      WHERE content LIKE '{%' OR content LIKE '[%'
    ` as any[]
    console.log(`待删除JSON数据: ${jsonCount[0].count}条`)

    console.log('\n正在删除JSON数据...')
    
    await prisma.$executeRaw`
      DELETE FROM document_chunks
      WHERE content LIKE '{%' OR content LIKE '[%'
    `

    const afterCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks
    ` as any[]
    console.log(`\n清理后总数: ${afterCount[0].count}条`)
    console.log(`已删除: ${Number(beforeCount[0].count) - Number(afterCount[0].count)}条`)

    console.log('\n✅ 清理完成！')
    console.log('剩余数据为纯文本医学文献，适合语义检索')

  } catch (error) {
    console.error('清理出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanJsonData()
