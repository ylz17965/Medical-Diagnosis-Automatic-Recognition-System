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
  if (!reader) return

  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''
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
          if (parsed.content) {
            fullContent += parsed.content
          }
          if (parsed.done) {
            sources = parsed.sources || []
            console.log('\n=== 完整回复 ===')
            console.log('回复长度:', fullContent.length, '字符')
            console.log('回复内容:')
            console.log(fullContent)
            console.log('\n=== Sources ===')
            console.log('数量:', sources.length)
            for (let i = 0; i < sources.length; i++) {
              const s = sources[i]
              console.log(`\n[${i + 1}] ${s.source}`)
              console.log('内容长度:', s.content?.length || 0, '字符')
              console.log('内容:', s.content)
            }
          }
        } catch {}
      }
    }
  }
}

testChat().catch(console.error)
