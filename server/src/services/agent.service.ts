import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface AgentDefinition {
  name: string
  description: string
  color: string
  emoji: string
  vibe: string
  content: string
}

export interface AgentRouterResult {
  agentId: string
  confidence: number
  defaultAgent?: boolean
}

const agentsDir = path.join(__dirname, '../../../agents')
const agentCache = new Map<string, AgentDefinition>()

function parseAgentMarkdown(content: string): AgentDefinition | null {
  try {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    
    if (!frontmatterMatch) {
      return null
    }
    
    const frontmatter = frontmatterMatch[1]
    const body = frontmatterMatch[2]
    
    const nameMatch = frontmatter.match(/^name:\s*(.+)$/m)
    const descriptionMatch = frontmatter.match(/^description:\s*(.+)$/m)
    const colorMatch = frontmatter.match(/^color:\s*(.+)$/m)
    const emojiMatch = frontmatter.match(/^emoji:\s*(.+)$/m)
    const vibeMatch = frontmatter.match(/^vibe:\s*(.+)$/m)
    
    return {
      name: nameMatch?.[1]?.trim() || 'Unknown Agent',
      description: descriptionMatch?.[1]?.trim() || '',
      color: colorMatch?.[1]?.trim() || '#3498db',
      emoji: emojiMatch?.[1]?.trim() || '🤖',
      vibe: vibeMatch?.[1]?.trim() || 'professional',
      content: body.trim()
    }
  } catch {
    return null
  }
}

export function loadAgent(agentId: string): AgentDefinition | null {
  const [category, name] = agentId.split('/')
  const filePath = path.join(agentsDir, category, `${name}.md`)
  
  if (!fs.existsSync(filePath)) {
    return null
  }
  
  const content = fs.readFileSync(filePath, 'utf-8')
  
  const agent = parseAgentMarkdown(content)
  if (agent) {
    agentCache.set(agentId, agent)
  }
  
  return agent
}

export function listAgents(): { id: string; name: string; description: string; emoji: string }[] {
  const agents: { id: string; name: string; description: string; emoji: string }[] = []
  
  const categories = ['engineering', 'medical']
  
  for (const category of categories) {
    const categoryDir = path.join(agentsDir, category)
    if (!fs.existsSync(categoryDir)) continue
    
    const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.md'))
    
    for (const file of files) {
      const name = file.replace('.md', '')
      const agent = loadAgent(`${category}/${name}`)
      if (agent) {
        agents.push({
          id: `${category}/${name}`,
          name: agent.name,
          description: agent.description,
          emoji: agent.emoji
        })
      }
    }
  }
  
  return agents
}

export function routeToAgent(userMessage: string): AgentRouterResult {
  const routingRules: { patterns: string[]; agentId: string }[] = [
    {
      patterns: ['肺结节', '肺癌', '肺部', 'LDCT', 'Fleischner'],
      agentId: 'medical/medical-lung-cancer-specialist'
    },
    {
      patterns: ['高血压', '血压', '降压', '心血管', '降压药'],
      agentId: 'medical/medical-hypertension-specialist'
    },
    {
      patterns: ['头痛', '偏头痛', '搏动性', '恶心呕吐', '畏光', '神经内科', '头晕', '眩晕', ' migraine'],
      agentId: 'medical/medical-neurology-headache-specialist'
    },
    {
      patterns: ['中医', '中药', '针灸', '体质', '养生', '辨证', '经络'],
      agentId: 'medical/medical-tcm-specialist'
    },
    {
      patterns: ['Vue', '前端', '组件', 'CSS', 'UI', '页面', '界面'],
      agentId: 'engineering/engineering-frontend-developer'
    },
    {
      patterns: ['API', '后端', '服务器', '数据库', '接口', 'Node'],
      agentId: 'engineering/engineering-backend-architect'
    },
    {
      patterns: ['RAG', '向量', '嵌入', 'embedding', 'AI', '模型', 'LLM'],
      agentId: 'engineering/engineering-ai-engineer'
    },
    {
      patterns: ['SQL', 'PostgreSQL', '查询', '索引', '性能', '优化'],
      agentId: 'engineering/engineering-database-optimizer'
    },
    {
      patterns: ['安全', '加密', '认证', '权限', 'HIPAA', '隐私'],
      agentId: 'engineering/engineering-security-engineer'
    }
  ]
  
  let bestMatch: AgentRouterResult | null = null
  
  for (const rule of routingRules) {
    for (const pattern of rule.patterns) {
      if (userMessage.includes(pattern)) {
        const matchCount = rule.patterns.filter(p => userMessage.includes(p)).length
        const confidence = matchCount / rule.patterns.length
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            agentId: rule.agentId,
            confidence
          }
        }
      }
    }
  }
  
  if (!bestMatch) {
    return {
      agentId: 'medical/medical-lung-cancer-specialist',
      confidence: 0.3,
      defaultAgent: true
    }
  }
  
  return bestMatch
}

export function getAgentSystemPrompt(agentId: string): string {
  const agent = loadAgent(agentId)
  if (!agent) {
    return '你是一名医疗AI助手，我将尽力帮助你。'
  }
  
  return `你是一名${agent.name}。

${agent.content}

---
请基于你的专业角色回答用户的问题。`
}
