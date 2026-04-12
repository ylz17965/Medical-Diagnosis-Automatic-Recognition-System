const testRAG = async () => {
  const response = await fetch('http://localhost:3001/api/v1/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': 'test-session-' + Date.now()
    },
    body: JSON.stringify({
      content: '头痛应该怎么办',
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
            console.log('\n=== Full Response ===')
            console.log(fullContent)
            console.log('\n=== RAG Results ===')
            if (parsed.sources) {
              console.log('RAG sources:', parsed.sources.length)
              for (const s of parsed.sources) {
                console.log(`  - ${s.source}: ${s.content?.substring(0, 100)}...`)
              }
            }
            if (parsed.citations) {
              console.log('Citations:', parsed.citations.length)
            }
            if (parsed.deepSearchResult) {
              console.log('DeepSearchResult totalSearched:', parsed.deepSearchResult.totalSearched)
              console.log('DeepSearchResult totalCited:', parsed.deepSearchResult.totalCited)
              console.log('DeepSearchResult citations:', parsed.deepSearchResult.citations?.length)
            }
          }
        } catch {}
      }
    }
  }
}

testRAG().catch(console.error)
