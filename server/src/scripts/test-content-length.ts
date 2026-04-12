const testContentLength = async () => {
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
            console.log('\n=== 合并后的内容长度 ===')
            for (let i = 0; i < sources.length; i++) {
              const s = sources[i]
              console.log(`[${i + 1}] ${s.source}: ${s.content?.length || 0} 字符`)
              console.log(`    是否被截断: ${s.content?.endsWith('...') ? '是' : '否'}`)
            }
            console.log('\n=== 最长内容的完整长度 ===')
            const longest = sources.reduce((a, b) => (a.content?.length > b.content?.length ? a : b))
            console.log(`长度: ${longest.content?.length}`)
          }
        } catch {}
      }
    }
  }
}

testContentLength().catch(console.error)
