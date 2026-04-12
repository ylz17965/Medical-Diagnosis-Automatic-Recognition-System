import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function analyzeDataStructure() {
  console.log('=== 数据结构分析 ===\n')
  
  try {
    const samples = await prisma.$queryRaw`
      SELECT 
        content,
        metadata
      FROM document_chunks
      TABLESAMPLE BERNOULLI(0.1)
      LIMIT 10
    ` as any[]

    console.log('数据样本分析:\n')
    
    let jsonCount = 0
    let textCount = 0
    
    for (const sample of samples) {
      const content = sample.content
      
      if (content.startsWith('{') || content.startsWith('[')) {
        jsonCount++
        try {
          const parsed = JSON.parse(content)
          console.log('JSON数据:')
          console.log(`  类型: ${Array.isArray(parsed) ? '数组' : '对象'}`)
          console.log(`  键: ${Object.keys(parsed).slice(0, 5).join(', ')}`)
          console.log(`  示例: ${content.substring(0, 100)}...`)
        } catch {
          console.log(`  无效JSON: ${content.substring(0, 80)}...`)
        }
      } else {
        textCount++
        console.log('文本数据:')
        console.log(`  内容: ${content.substring(0, 100)}...`)
      }
      console.log('')
    }

    console.log(`\n统计: JSON数据 ${jsonCount}条, 文本数据 ${textCount}条`)

    const sourceTypes = await prisma.$queryRaw`
      SELECT 
        CASE 
          WHEN content LIKE '{%' THEN 'JSON对象'
          WHEN content LIKE '[%' THEN 'JSON数组'
          ELSE '纯文本'
        END as type,
        COUNT(*) as count
      FROM document_chunks
      GROUP BY type
      ORDER BY count DESC
    ` as any[]
    
    console.log('\n数据类型分布:')
    sourceTypes.forEach(s => {
      console.log(`  - ${s.type}: ${s.count}条`)
    })

    const tcmCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks
      WHERE content LIKE '%TCM_ACP%' OR content LIKE '%穴位%'
    ` as any[]
    console.log(`\n中医穴位数据: ${tcmCount[0].count}条`)

    const literatureCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks
      WHERE content NOT LIKE '{%' AND content NOT LIKE '[%'
    ` as any[]
    console.log(`纯文本文献数据: ${literatureCount[0].count}条`)

  } catch (error) {
    console.error('分析出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

analyzeDataStructure()
