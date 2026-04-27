import type { Message } from '@/stores/conversation'

export function exportToMarkdown(
  title: string,
  messages: Message[],
  filename?: string
): void {
  const lines: string[] = []

  lines.push(`# ${title}`)
  lines.push('')
  lines.push(`> 导出时间：${new Date().toLocaleString('zh-CN')}`)
  lines.push('')

  for (const message of messages) {
    if (message.loading || message.streaming) continue

    const timestamp = message.timestamp
      ? new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      : ''

    if (message.role === 'user') {
      lines.push(`## 👤 用户 ${timestamp}`)
      lines.push('')
      lines.push(message.content)
      lines.push('')
    } else {
      lines.push(`## 🤖 AI助手 ${timestamp}`)
      lines.push('')
      lines.push(message.content)
      lines.push('')

      if (message.sources && message.sources.length > 0) {
        lines.push('### 📚 引用来源')
        lines.push('')
        message.sources.forEach((source, index) => {
          lines.push(`${index + 1}. **${source.source}**`)
          lines.push(`   > ${source.content.substring(0, 200)}${source.content.length > 200 ? '...' : ''}`)
          lines.push('')
        })
      }

      if (message.citations && message.citations.length > 0) {
        lines.push('### 📖 参考文献')
        lines.push('')
        message.citations.forEach((citation, index) => {
          lines.push(`${index + 1}. **${citation.title}**`)
          lines.push(`   - 作者：${citation.authors}`)
          lines.push(`   - 来源：${citation.journal}, ${citation.year}`)
          if (citation.impactFactor) {
            lines.push(`   - 影响因子：${citation.impactFactor.toFixed(2)}`)
          }
          lines.push('')
        })
      }

      lines.push('---')
      lines.push('')
    }
  }

  lines.push('---')
  lines.push('')
  lines.push('*本文由智疗助手生成，AI生成内容仅供参考，不构成诊断建议*')

  const markdown = lines.join('\n')
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename || `${title.replace(/[/\\?%*:|"<>]/g, '_')}.md`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
