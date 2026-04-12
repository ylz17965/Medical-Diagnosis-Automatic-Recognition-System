import fetch from 'node-fetch'

const testChat = async () => {
  const body = {
    content: "发热待查的诊断标准是什么？",
    useRAG: true,
    useAgent: true
  }
  
  console.log('发送请求:', JSON.stringify(body, null, 2))
  
  try {
    const response = await fetch('http://localhost:3001/api/v1/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': 'test-session-123'
      },
      body: JSON.stringify(body)
    })
    
    console.log('响应状态:', response.status)
    console.log('响应头:', Object.fromEntries(response.headers.entries()))
    
    const text = await response.text()
    console.log('\n=== 原始响应 ===')
    console.log(text.substring(0, 2000))
    
    const lines = text.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        try {
          const parsed = JSON.parse(data)
          if (parsed.done) {
            console.log('\n=== 最终结果 ===')
            console.log('Agent:', parsed.agentUsed)
            console.log('引用数量:', parsed.citations?.length || 0)
            console.log('深度搜索结果:', JSON.stringify(parsed.deepSearchResult, null, 2))
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  } catch (error) {
    console.error('请求失败:', error)
  }
}

testChat()
