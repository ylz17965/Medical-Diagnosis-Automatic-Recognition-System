import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function analyzeLanguage() {
  console.log('=== 数据语言分析 ===\n')
  
  try {
    const chinesePattern = '[\u4e00-\u9fa5]'
    
    const chineseCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks
      WHERE content ~ ${chinesePattern}
    ` as any[]
    
    const englishCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks
      WHERE content !~ ${chinesePattern}
    ` as any[]

    console.log(`中文内容: ${chineseCount[0].count}条`)
    console.log(`英文/其他内容: ${englishCount[0].count}条`)

    console.log('\n中文内容样例:')
    const chineseSamples = await prisma.$queryRaw`
      SELECT content FROM document_chunks
      WHERE content ~ ${chinesePattern}
        AND content NOT LIKE '{%'
        AND content NOT LIKE '[%'
      LIMIT 3
    ` as any[]
    
    chineseSamples.forEach((s, i) => {
      console.log(`  [${i + 1}] ${s.content.substring(0, 100)}...`)
    })

    console.log('\n英文内容样例:')
    const englishSamples = await prisma.$queryRaw`
      SELECT content FROM document_chunks
      WHERE content !~ ${chinesePattern}
        AND content NOT LIKE '{%'
        AND content NOT LIKE '[%'
      LIMIT 3
    ` as any[]
    
    englishSamples.forEach((s, i) => {
      console.log(`  [${i + 1}] ${s.content.substring(0, 100)}...`)
    })

    console.log('\n\n问题诊断:')
    console.log('  - 数据主要是英文医学文献')
    console.log('  - 用户查询是中文')
    console.log('  - bge-base-zh-v1.5 是中文模型，对英文支持有限')
    console.log('  - 跨语言检索效果差')

  } catch (error) {
    console.error('分析出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

analyzeLanguage()
