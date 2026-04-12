const testChat = async () => {
  const body = {
    content: "发热待查的诊断标准是什么？",
    useRAG: true,
    useAgent: true
  }
  
  console.log('发送请求:', JSON.stringify(body, null, 2))
  
  const response = await fetch('http://localhost:3001/api/v1/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': 'test-session-123'
    },
    body: JSON.stringify(body)
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
  }
  
  const lines = buffer.split('\n')
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6)
      try {
        const parsed = JSON.parse(data)
        if (parsed.done) {
          console.log('\n=== 最终结果 ===')
          console.log('Agent:', parsed.agentUsed)
          console.log('引用数量:', parsed.citations?.length || 0)
          console.log('深度搜索结果:', parsed.deepSearchResult)
          if (parsed.citations && parsed.citations.length > 0) {
            console.log('\n第一个引用:')
            console.log('标题:', parsed.citations[0].title)
            console.log('DOI:', parsed.citations[0].doi)
            console.log('引用内容:', parsed.citations[0].citationContent)
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }
}

testChat().catch(console.error)
