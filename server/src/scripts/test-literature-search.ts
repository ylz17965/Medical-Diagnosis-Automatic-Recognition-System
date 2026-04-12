import { LiteratureService } from '../services/literature.service.js'

const litService = new LiteratureService()

const queries = [
  '头痛怎么治疗',
  '偏头痛',
  '紧张性头痛',
  '感冒发烧',
]

console.log('=== 文献服务搜索测试 ===\n')

for (const query of queries) {
  console.log(`\n查询: "${query}"`)
  console.log('-'.repeat(40))
  
  const result = litService.deepSearch(query, 5)
  
  console.log(`检索结果: ${result.totalSearched} 篇`)
  console.log(`引用数量: ${result.totalCited} 篇`)
  console.log(`摘要: ${result.searchSummary}`)
  
  if (result.citations.length > 0) {
    console.log('\n引用详情:')
    result.citations.forEach((c, i) => {
      console.log(`  [${i + 1}] ${c.title}`)
      console.log(`      类型: ${c.typeLabel}`)
      console.log(`      作者: ${c.authors}`)
      console.log(`      期刊: ${c.journal}, ${c.year}`)
      console.log(`      影响因子: ${c.impactFactor || '无'}`)
      console.log(`      DOI: ${c.doi || '无'}`)
      console.log(`      引用内容: ${c.citationContent.substring(0, 50)}...`)
      console.log('')
    })
  } else {
    console.log('  未找到相关文献')
  }
}
