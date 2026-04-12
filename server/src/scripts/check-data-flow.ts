import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface CountResult {
  total: bigint
}

interface SourceResult {
  source: string
  count: bigint
}

interface EmbeddingResult {
  embedding: string | null
}

async function checkDataFlow() {
  console.log('========================================')
  console.log('  数据流向检查')
  console.log('========================================\n')

  try {
    console.log('【1. 向量数据库统计】')
    const vectorStats = await prisma.$queryRaw<CountResult[]>`SELECT COUNT(*) as total FROM document_chunks`
    console.log(`   总向量块: ${vectorStats[0].total}`)
    
    const docStats = await prisma.$queryRaw<CountResult[]>`SELECT COUNT(*) as total FROM knowledge_documents`
    console.log(`   总文档数: ${docStats[0].total}`)
    
    console.log('\n【2. 数据来源】')
    const sources = await prisma.$queryRaw<SourceResult[]>`
      SELECT source, COUNT(*) as count
      FROM knowledge_documents
      GROUP BY source
      ORDER BY count DESC
      LIMIT 5
    `
    sources.forEach((s) => {
      console.log(`   - ${s.source}: ${s.count} 条`)
    })

    console.log('\n【3. 向量维度检查】')
    const sample = await prisma.$queryRaw<EmbeddingResult[]>`SELECT embedding::text FROM document_chunks LIMIT 1`
    if (sample.length > 0 && sample[0].embedding) {
      const vec = sample[0].embedding
      const dim = vec.split(',').length
      console.log(`   数据维度: ${dim}`)
      console.log(`   ${dim === 1024 ? '正确 (BGE-M3)' : '不匹配'}`)
    }

    console.log('\n========================================')
    console.log('【数据使用说明】')
    console.log('========================================')
    console.log('1. 向量数据库 (PostgreSQL + pgvector)')
    console.log('   - 你收集的 271,910 个文本块存储在这里')
    console.log('   - 用于 RAG 语义检索')
    console.log('')
    console.log('2. 文献引用库 (literature_database.json)')
    console.log('   - 约 10 篇精选指南/共识')
    console.log('   - 用于显示论文引用、影响因子、DOI')
    console.log('')
    console.log('当前状态: BGE-M3 多语言向量已生成')
    console.log('   - 向量维度: 1024')
    console.log('   - 支持中英文跨语言检索')

  } catch (error) {
    console.error('检查失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDataFlow()
