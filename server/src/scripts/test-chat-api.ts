const testChat = async () => {
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
          if (parsed.done) {
            console.log('\n=== Final Response ===')
            console.log('Has citations:', parsed.citations ? parsed.citations.length : 0)
            console.log('Has deepSearchResult:', !!parsed.deepSearchResult)
            if (parsed.deepSearchResult) {
              console.log('deepSearchResult:', JSON.stringify(parsed.deepSearchResult, null, 2))
            }
            if (parsed.citations) {
              console.log('citations:', JSON.stringify(parsed.citations, null, 2))
            }
          }
        } catch {}
      }
    }
  }
}

testChat().catch(console.error)
