import literatureDatabase from '../data/literature_database.json' with { type: 'json' }

console.log('=== 文献数据库检查 ===\n')

console.log('元数据:', literatureDatabase.metadata)
console.log('\n文献数量:', literatureDatabase.literature.length)

console.log('\n文献列表:')
literatureDatabase.literature.forEach((lit: any, i: number) => {
  console.log(`  [${i + 1}] ${lit.id}: ${lit.title}`)
  console.log(`      关键词: ${lit.keywords.join(', ')}`)
  console.log(`      影响因子: ${lit.impactFactor || '无'}`)
  console.log(`      DOI: ${lit.doi || '无'}`)
  console.log(`      引用数: ${lit.citations.length}`)
})

console.log('\n\n=== 搜索头痛相关文献 ===')
const headacheKeywords = ['头痛', '偏头痛', '紧张性头痛', 'migraine', 'headache']

for (const keyword of headacheKeywords) {
  const found = literatureDatabase.literature.filter((lit: any) => 
    lit.keywords.some((k: string) => k.includes(keyword)) ||
    lit.title.includes(keyword)
  )
  
  if (found.length > 0) {
    console.log(`\n关键词 "${keyword}" 匹配到 ${found.length} 篇:`)
    found.forEach((lit: any) => {
      console.log(`  - ${lit.id}: ${lit.title}`)
      console.log(`    影响因子: ${lit.impactFactor || '无'}`)
      console.log(`    DOI: ${lit.doi || '无'}`)
    })
  }
}
