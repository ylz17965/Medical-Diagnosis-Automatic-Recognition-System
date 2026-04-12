import literatureDatabase from '../data/literature_database.json' with { type: 'json' }

console.log('=== 文献数据库加载测试 ===\n')
console.log('类型:', typeof literatureDatabase)
console.log('键:', Object.keys(literatureDatabase))
console.log('文献数量:', literatureDatabase.literature?.length)

if (literatureDatabase.literature && literatureDatabase.literature.length > 0) {
  console.log('\n第一篇文献:')
  const first = literatureDatabase.literature[0]
  console.log('  ID:', first.id)
  console.log('  标题:', first.title)
  console.log('  关键词:', first.keywords)
}
