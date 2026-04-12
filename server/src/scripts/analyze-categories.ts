import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function analyzeDataCategories() {
  console.log('=== 数据分类分析 ===\n')
  
  try {
    const totalChunks = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks
    ` as any[]
    console.log(`总文本块: ${totalChunks[0].count}`)

    console.log('\n--- 按内容类型分类 ---')
    
    const jsonObjects = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks
      WHERE content LIKE '{%'
    ` as any[]
    console.log(`JSON对象数据: ${jsonObjects[0].count}条`)

    const jsonArrays = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks
      WHERE content LIKE '[%'
    ` as any[]
    console.log(`JSON数组数据: ${jsonArrays[0].count}条`)

    const pureText = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks
      WHERE content NOT LIKE '{%' AND content NOT LIKE '[%'
    ` as any[]
    console.log(`纯文本数据: ${pureText[0].count}条`)

    console.log('\n--- 按语言分类 ---')
    
    const chineseContent = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks
      WHERE content ~ '[\u4e00-\u9fa5]'
    ` as any[]
    console.log(`中文内容: ${chineseContent[0].count}条`)

    const englishContent = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks
      WHERE content !~ '[\u4e00-\u9fa5]'
    ` as any[]
    console.log(`英文/其他内容: ${englishContent[0].count}条`)

    console.log('\n--- 特定数据类型 ---')
    
    const tcmAcupuncture = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks
      WHERE content LIKE '%TCM_ACP%' OR content LIKE '%"name":%穴位%'
    ` as any[]
    console.log(`中医穴位数据: ${tcmAcupuncture[0].count}条`)

    const tcmHerbs = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks
      WHERE content LIKE '%TCM_HERB%' OR content LIKE '%"功效":%中药%'
    ` as any[]
    console.log(`中药数据: ${tcmHerbs[0].count}条`)

    const tcmPrescriptions = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks
      WHERE content LIKE '%TCM_PRE%' OR content LIKE '%"组成":%'
    ` as any[]
    console.log(`中医方剂数据: ${tcmPrescriptions[0].count}条`)

    console.log('\n--- 数据样例 ---')
    
    console.log('\nJSON对象样例:')
    const jsonObjSamples = await prisma.$queryRaw`
      SELECT content FROM document_chunks
      WHERE content LIKE '{%'
      LIMIT 2
    ` as any[]
    jsonObjSamples.forEach((s, i) => {
      console.log(`  [${i + 1}] ${s.content.substring(0, 150)}...`)
    })

    console.log('\n纯文本样例:')
    const textSamples = await prisma.$queryRaw`
      SELECT content FROM document_chunks
      WHERE content NOT LIKE '{%' AND content NOT LIKE '[%'
      LIMIT 2
    ` as any[]
    textSamples.forEach((s, i) => {
      console.log(`  [${i + 1}] ${s.content.substring(0, 150)}...`)
    })

    console.log('\n\n=== 建议删除的数据 ===')
    console.log('以下数据对医学问答帮助不大，建议删除：')
    console.log(`  1. JSON对象数据: ${jsonObjects[0].count}条 - 结构化数据，不适合语义检索`)
    console.log(`  2. JSON数组数据: ${jsonArrays[0].count}条 - 结构化数据，不适合语义检索`)
    console.log(`  3. 中医穴位数据: ${tcmAcupuncture[0].count}条 - JSON格式，语义匹配效果差`)
    
    const totalToDelete = Number(jsonObjects[0].count) + Number(jsonArrays[0].count)
    const remaining = Number(totalChunks[0].count) - totalToDelete
    
    console.log(`\n删除后剩余: ${remaining}条纯文本医学文献`)
    console.log(`\n执行删除命令:`)
    console.log(`  npx tsx src/scripts/clean-json-data.ts`)

  } catch (error) {
    console.error('分析出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

analyzeDataCategories()
