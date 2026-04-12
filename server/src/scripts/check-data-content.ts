import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDataContent() {
  console.log('=== 数据内容分析 ===\n')
  
  try {
    const categories = await prisma.$queryRaw`
      SELECT 
        metadata->>'category' as category,
        COUNT(*) as count
      FROM document_chunks
      GROUP BY metadata->>'category'
      ORDER BY count DESC
      LIMIT 20
    ` as any[]
    
    console.log('数据分类分布:')
    categories.forEach(c => {
      console.log(`  - ${c.category || '未分类'}: ${c.count}条`)
    })

    const headacheCheck = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks
      WHERE content LIKE '%头痛%' OR content LIKE '%偏头痛%' OR content LIKE '%migraine%'
    ` as any[]
    console.log(`\n头痛相关内容: ${headacheCheck[0].count}条`)

    const lungCancerCheck = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks
      WHERE content LIKE '%肺癌%' OR content LIKE '%lung cancer%'
    ` as any[]
    console.log(`肺癌相关内容: ${lungCancerCheck[0].count}条`)

    const hypertensionCheck = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks
      WHERE content LIKE '%高血压%' OR content LIKE '%hypertension%'
    ` as any[]
    console.log(`高血压相关内容: ${hypertensionCheck[0].count}条`)

    const diabetesCheck = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM document_chunks
      WHERE content LIKE '%糖尿病%' OR content LIKE '%diabetes%'
    ` as any[]
    console.log(`糖尿病相关内容: ${diabetesCheck[0].count}条`)

    console.log('\n\n随机抽样内容预览:')
    const samples = await prisma.$queryRaw`
      SELECT 
        content,
        metadata->>'title' as title,
        metadata->>'source' as source
      FROM document_chunks
      TABLESAMPLE BERNOULLI(0.1)
      LIMIT 5
    ` as any[]
    
    samples.forEach((s, i) => {
      console.log(`\n[${i + 1}] 标题: ${s.title || '无'}`)
      console.log(`    来源: ${s.source || '无'}`)
      console.log(`    内容: ${s.content?.substring(0, 150)}...`)
    })

  } catch (error) {
    console.error('分析出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDataContent()
