import { literatureService } from '../services/literature.service.js'

console.log('=== 测试文献搜索 ===')

const query = '发热待查的诊断标准是什么？'
console.log('查询:', query)

const results = literatureService.search(query, 5)
console.log('搜索结果数量:', results.length)

if (results.length > 0) {
  console.log('\n第一个结果:')
  console.log('标题:', results[0].literature.title)
  console.log('匹配的引用:', results[0].matchedCitations.length)
  console.log('相关性分数:', results[0].relevanceScore)
}

const deepResult = literatureService.deepSearch(query, 5)
console.log('\n深度搜索结果:')
console.log('总检索:', deepResult.totalSearched)
console.log('总引用:', deepResult.totalCited)
console.log('引用数量:', deepResult.citations.length)

if (deepResult.citations.length > 0) {
  console.log('\n第一个引用:')
  const c = deepResult.citations[0]
  console.log('ID:', c.id)
  console.log('标题:', c.title)
  console.log('DOI:', c.doi)
  console.log('Link:', c.link)
  console.log('引用内容:', c.citationContent)
}
