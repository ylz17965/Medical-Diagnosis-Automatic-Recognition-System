import { PrismaClient, ConversationType, MessageRole } from '@prisma/client'

export class DashboardService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async getStats() {
    const totalUsers = await this.prisma.user.count({
      where: { status: 'ACTIVE' },
    })

    const totalConsultations = await this.prisma.conversation.count()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayConsultations = await this.prisma.conversation.count({
      where: { createdAt: { gte: today } },
    })

    const userMessages = await this.prisma.message.findMany({
      where: {
        role: MessageRole.USER,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: { createdAt: true, conversationId: true },
      orderBy: { createdAt: 'asc' },
      take: 200,
    })

    const assistantMessages = await this.prisma.message.findMany({
      where: {
        role: MessageRole.ASSISTANT,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: { createdAt: true, conversationId: true },
      orderBy: { createdAt: 'asc' },
      take: 200,
    })

    let totalResponseTime = 0
    let responseCount = 0
    for (const userMsg of userMessages) {
      const matchingAssistant = assistantMessages.find(
        (a) => a.conversationId === userMsg.conversationId && a.createdAt > userMsg.createdAt
      )
      if (matchingAssistant) {
        totalResponseTime += matchingAssistant.createdAt.getTime() - userMsg.createdAt.getTime()
        responseCount++
      }
    }
    const avgResponseTime = responseCount > 0 ? Math.round((totalResponseTime / responseCount / 1000) * 10) / 10 : 0

    const totalConversations = await this.prisma.conversation.count()
    const conversationsWithMultipleMessages = await this.prisma.conversation.findMany({
      where: { messages: { some: { role: MessageRole.ASSISTANT } } },
      select: { id: true },
    })
    const satisfactionRate = totalConversations > 0
      ? Math.round((conversationsWithMultipleMessages.length / totalConversations) * 1000) / 10
      : 0

    const activeHospitals = 0

    return {
      totalUsers,
      totalConsultations,
      todayConsultations,
      avgResponseTime,
      satisfactionRate,
      activeHospitals,
    }
  }

  async getConsultationTrend() {
    const now = new Date()
    const hours: Array<{ hour: number; count: number }> = []

    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now)
      hourStart.setHours(now.getHours() - i, 0, 0, 0)
      const hourEnd = new Date(hourStart)
      hourEnd.setHours(hourStart.getHours() + 1, 0, 0, 0)

      const count = await this.prisma.conversation.count({
        where: {
          createdAt: {
            gte: hourStart,
            lt: hourEnd,
          },
        },
      })

      hours.push({ hour: hourStart.getHours(), count })
    }

    return hours
  }

  async getDiseaseDistribution() {
    const conversations = await this.prisma.conversation.findMany({
      where: { type: { not: null as unknown as ConversationType } },
      select: { type: true },
    })

    const typeCountMap: Record<string, number> = {}
    for (const conv of conversations) {
      const type = conv.type || 'CHAT'
      typeCountMap[type] = (typeCountMap[type] || 0) + 1
    }

    const colorMap: Record<string, string> = {
      CHAT: '#3b82f6',
      SEARCH: '#10b981',
      REPORT: '#f59e0b',
      DRUG: '#ef4444',
      LUNG_CT: '#06b6d4',
    }

    const nameMap: Record<string, string> = {
      CHAT: '健康咨询',
      SEARCH: '知识搜索',
      REPORT: '报告解读',
      DRUG: '药品识别',
      LUNG_CT: '肺部CT',
    }

    return Object.entries(typeCountMap).map(([type, value]) => ({
      name: nameMap[type] || type,
      value,
      color: colorMap[type] || '#6b7280',
    }))
  }

  async getRecentActivities() {
    const recentMessages = await this.prisma.message.findMany({
      where: { role: MessageRole.USER },
      select: { content: true, createdAt: true, conversationId: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const conversationIds = [...new Set(recentMessages.map((m) => m.conversationId))]
    const conversations = await this.prisma.conversation.findMany({
      where: { id: { in: conversationIds } },
      select: { id: true, type: true },
    })
    const convTypeMap = new Map(conversations.map((c) => [c.id, c.type]))

    const actionNameMap: Record<string, string> = {
      CHAT: '健康咨询',
      SEARCH: '知识搜索',
      REPORT: '报告解读',
      DRUG: '药品识别',
      LUNG_CT: '肺部CT',
    }

    return recentMessages.map((msg) => {
      const convType = convTypeMap.get(msg.conversationId) || 'CHAT'
      return {
        time: msg.createdAt.toISOString(),
        action: msg.content.length > 30 ? msg.content.slice(0, 30) + '...' : msg.content,
        result: actionNameMap[convType] || '已处理',
      }
    })
  }

  async getFeatureStats() {
    const features: Array<{ name: string; type: ConversationType }> = [
      { name: '健康咨询', type: ConversationType.CHAT },
      { name: '知识搜索', type: ConversationType.SEARCH },
      { name: '报告解读', type: ConversationType.REPORT },
      { name: '药品识别', type: ConversationType.DRUG },
    ]

    const stats = await Promise.all(
      features.map(async (feature) => {
        const count = await this.prisma.conversation.count({
          where: { type: feature.type },
        })
        return {
          name: feature.name,
          count,
          description: `${feature.name}功能使用了 ${count} 次`,
        }
      })
    )

    return stats
  }
}
