import fetch from 'node-fetch'

const testChat = async () => {
  const body = {
    content: "头痛持续两天且摇头加重",
    useRAG: true,
    useAgent: true
  }
  
  console.log('=== 测试头痛查询 ===')
  console.log('查询:', body.content)
  
  try {
    const response = await fetch('http://localhost:3001/api/v1/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': 'test-headache-session'
      },
      body: JSON.stringify(body)
    })
    
    const text = await response.text()
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
            
            if (parsed.citations && parsed.citations.length > 0) {
              console.log('\n引用详情:')
              parsed.citations.forEach((c: any, i: number) => {
                console.log(`\n[${i + 1}] ${c.title}`)
                console.log(`   类型: ${c.typeLabel}`)
                console.log(`   影响因子: ${c.impactFactor}`)
                console.log(`   DOI: ${c.doi}`)
                console.log(`   引用内容: ${c.citationContent?.substring(0, 100)}...`)
              })
            }
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
