const testChat = async (query: string) => {
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
  if (!reader) return

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
            console.log('\n=== Query:', query, '===')
            console.log('Content has citations:', /\[\d+\]/.test(fullContent))
            if (parsed.deepSearchResult) {
              console.log('Literature citations:', parsed.deepSearchResult.citations?.length || 0)
              for (const c of parsed.deepSearchResult.citations || []) {
                console.log(`  - ${c.title}`)
                console.log(`    Link: ${c.link}`)
              }
            }
            if (parsed.sources) {
              console.log('RAG sources:', parsed.sources.length)
            }
          }
        } catch {}
      }
    }
  }
}

const main = async () => {
  await testChat('头痛应该怎么办')
  await testChat('后脑勺压迫感')
}

main().catch(console.error)
