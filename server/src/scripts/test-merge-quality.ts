const testMergeQuality = async () => {
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
  if (!reader) return

  const decoder = new TextDecoder()
  let buffer = ''
  let sources: any[] = []

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
            sources = parsed.sources || []
            console.log('\n=== 详细内容 ===')
            for (let i = 0; i < sources.length; i++) {
              const s = sources[i]
              console.log(`\n[${i + 1}] ${s.source} (${s.content?.length} 字符)`)
              console.log('-'.repeat(50))
              console.log(s.content)
              console.log('-'.repeat(50))
            }
          }
        } catch {}
      }
    }
  }
}

testMergeQuality().catch(console.error)
