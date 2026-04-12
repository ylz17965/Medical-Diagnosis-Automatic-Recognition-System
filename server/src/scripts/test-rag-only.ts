const testChat = async () => {
  const response = await fetch('http://localhost:3001/api/v1/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': 'test-session-' + Date.now()
    },
    body: JSON.stringify({
      content: '如何预防感冒',
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
            console.log('\n=== Test Result ===')
            console.log('Content has [1][2] citations:', /\[\d+\]/.test(fullContent))
            console.log('RAG sources:', parsed.sources?.length || 0)
            console.log('Citations:', parsed.citations?.length || 0)
            console.log('deepSearchResult:', parsed.deepSearchResult?.searchSummary)
            if (parsed.sources && parsed.sources.length > 0) {
              console.log('\nSources:')
              for (const s of parsed.sources) {
                console.log(`  - ${s.source}: ${s.content?.substring(0, 60)}...`)
              }
            }
          }
        } catch {}
      }
    }
  }
}

testChat().catch(console.error)
