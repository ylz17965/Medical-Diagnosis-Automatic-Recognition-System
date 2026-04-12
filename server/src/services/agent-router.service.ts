import fs from 'fs'
import path from 'path'

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
  agentName: string
  confidence: number
  keywords: string[]
}

const AGENTS_DIR = path.join(process.cwd(), 'agents')

const agentCache: Map<string, AgentDefinition> = new Map()

function parseAgentMarkdown(filePath: string): AgentDefinition | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!frontmatterMatch) return null
    
    const frontmatter = frontmatterMatch[1]
    const body = content.slice(frontmatterMatch[0].length).trim()
    
    const getValue = (key: string): string => {
      const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
      return match ? match[1].trim() : ''
    }
    
    return {
      name: getValue('name'),
      description: getValue('description'),
      color: getValue('color'),
      emoji: getValue('emoji'),
      vibe: getValue('vibe'),
      content: body
    }
  } catch (error) {
    console.error(`Failed to parse agent: ${filePath}`, error)
    return null
  }
}

export function loadAgent(agentId: string): AgentDefinition | null {
  if (agentCache.has(agentId)) {
    return agentCache.get(agentId)!
  }
  
  const [category, name] = agentId.split('/')
  const filePath = path.join(AGENTS_DIR, category, `${name}.md`)
  
  if (!fs.existsSync(filePath)) {
    return null
  }
  
  const agent = parseAgentMarkdown(filePath)
  if (agent) {
    agentCache.set(agentId, agent)
  }
  
  return agent
}

export function listAgents(): { id: string; name: string; description: string; emoji: string }[] {
  const agents: { id: string; name: string; description: string; emoji: string }[] = []
  
  const categories = ['engineering', 'medical']
  
  for (const category of categories) {
    const categoryDir = path.join(AGENTS_DIR, category)
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
      patterns: ['肺结节', '肺癌', '肺部', 'CT', 'LDCT', '筛查', 'Fleischner'],
      agentId: 'medical/medical-lung-cancer-specialist'
    },
    {
      patterns: ['高血压', '血压', '降压', '心血管', '降压药'],
      agentId: 'medical/medical-hypertension-specialist'
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
  
  let bestMatch: AgentRouterResult = {
    agentId: 'medical/medical-lung-cancer-specialist',
    agentName: 'Lung Cancer Screening Specialist',
    confidence: 0,
    keywords: []
  }
  
  for (const rule of routingRules) {
    const matchedKeywords: string[] = []
    let matchCount = 0
    
    for (const pattern of rule.patterns) {
      if (userMessage.includes(pattern)) {
        matchCount++
        matchedKeywords.push(pattern)
      }
    }
    
    const confidence = matchCount / rule.patterns.length
    
    if (confidence > bestMatch.confidence) {
      const agent = loadAgent(rule.agentId)
      bestMatch = {
        agentId: rule.agentId,
        agentName: agent?.name || rule.agentId,
        confidence,
        keywords: matchedKeywords
      }
    }
  }
  
  return bestMatch
}

export function buildAgentPrompt(agentId: string, userMessage: string): string {
  const agent = loadAgent(agentId)
  
  if (!agent) {
    return `你是一个医疗AI助手。请回答用户的问题：${userMessage}`
  }
  
  return `${agent.content}

## 用户问题
${userMessage}

请基于你的专业角色回答用户问题。记住：
1. 保持专业、谨慎的态度
2. 不做确诊，只提供建议
3. 高危情况建议就医
4. 用通俗易懂的语言解释专业概念`
}
