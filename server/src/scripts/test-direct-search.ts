import literatureDatabase from '../data/literature_database.json' with { type: 'json' }

console.log('=== LiteratureService 直接测试 ===\n')

const literature = literatureDatabase.literature
console.log('文献数量:', literature.length)

const query = '头痛怎么治疗'
const queryWords = query.split(/[\s，。！？、；：]+/).filter(w => w.length >= 2)
console.log('查询词:', queryWords)

console.log('\n搜索关键词匹配:')
for (const lit of literature) {
  for (const keyword of lit.keywords) {
    for (const word of queryWords) {
      if (keyword.includes(word) || word.includes(keyword)) {
        console.log(`  匹配: "${word}" <-> 关键词 "${keyword}" (文献: ${lit.id})`)
      }
    }
  }
}

console.log('\n搜索标题匹配:')
for (const lit of literature) {
  for (const word of queryWords) {
    if (lit.title.includes(word)) {
      console.log(`  匹配: "${word}" <-> 标题 "${lit.title}" (文献: ${lit.id})`)
    }
  }
}

console.log('\n文献 L010 详情:')
const l010 = literature.find(l => l.id === 'L010')
if (l010) {
  console.log('  标题:', l010.title)
  console.log('  关键词:', l010.keywords)
  console.log('  引用数:', l010.citations.length)
  console.log('  影响因子:', l010.impactFactor)
  console.log('  DOI:', l010.doi)
}
