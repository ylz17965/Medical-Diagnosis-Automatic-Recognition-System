const testRAG = async (query: string) => {
  console.log(`\n${'='.repeat(50)}`)
  console.log(`测试查询: ${query}`)
  console.log('='.repeat(50))

  const response = await fetch('http://localhost:3001/api/v1/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': 'test-session-' + Date.now()
    },
    body: JSON.stringify({
      content: query,
      type: 'CHAT',
      useRAG: true
    })
  })

  const reader = response.body?.getReader()
  if (!reader) {
    console.log('No reader')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        try {
          const parsed = JSON.parse(data)
          if (parsed.content) {
            fullContent += parsed.content
          }
          if (parsed.done) {
            console.log('\n📊 测试结果:')
            console.log(`- 回复包含引用标注 [1][2]: ${/\[\d+\]/.test(fullContent) ? '✅ 是' : '❌ 否'}`)
            console.log(`- RAG sources 数量: ${parsed.sources?.length || 0}`)
            console.log(`- 搜索摘要: ${parsed.deepSearchResult?.searchSummary}`)
            
            if (parsed.sources && parsed.sources.length > 0) {
              console.log('\n📚 引用来源:')
              parsed.sources.forEach((s: any, i: number) => {
                console.log(`  [${i + 1}] ${s.source}`)
                console.log(`      ${s.content?.substring(0, 80)}...`)
              })
            }
          }
        } catch {}
      }
    }
  }
}

const main = async () => {
  console.log('🚀 RAG 优化测试')
  console.log('测试项目: Rerank API + Hybrid Search + 语义切分')
  
  await testRAG('如何预防感冒')
  await testRAG('头痛应该怎么办')
  await testRAG('高血压怎么治疗')
  
  console.log('\n✅ 测试完成!')
}

main().catch(console.error)
