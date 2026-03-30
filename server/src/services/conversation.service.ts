import { ConversationRepository } from '../repositories/conversation.repository.js'
import { NotFoundError, ForbiddenError } from '../middleware/error-handler.middleware.js'

type ConversationType = 'CHAT' | 'SEARCH' | 'REPORT' | 'DRUG'

interface Conversation {
  id: string
  userId: string
  type: ConversationType
  title: string | null
  createdAt: Date
  updatedAt: Date
  messages?: Message[]
}

interface Message {
  id: string
  conversationId: string
  role: string
  content: string
  sources?: string | null
  createdAt: Date
}

interface CreateConversationData {
  type: ConversationType
  title?: string
}

export class ConversationService {
  constructor(private conversationRepo: ConversationRepository) {}

  async getConversations(
    userId: string,
    page: number,
    limit: number,
    type?: ConversationType
  ): Promise<{ conversations: Conversation[]; total: number }> {
    const skip = (page - 1) * limit
    const { conversations, total } = await this.conversationRepo.findMany(
      userId,
      skip,
      limit,
      type
    )

    return { conversations, total }
  }

  async getConversationById(id: string, userId: string): Promise<Conversation> {
    const conversation = await this.conversationRepo.findById(id)

    if (!conversation) {
      throw new NotFoundError('对话不存在')
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenError('无权访问此对话')
    }

    return conversation
  }

  async createConversation(
    userId: string,
    data: CreateConversationData
  ): Promise<Conversation> {
    const title = data.title || this.generateDefaultTitle(data.type)

    const conversation = await this.conversationRepo.create({
      userId,
      type: data.type,
      title,
    })

    return conversation
  }

  async deleteConversation(id: string, userId: string): Promise<void> {
    const conversation = await this.conversationRepo.findById(id)

    if (!conversation) {
      throw new NotFoundError('对话不存在')
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenError('无权删除此对话')
    }

    await this.conversationRepo.delete(id)
  }

  async updateTitle(id: string, userId: string, title: string): Promise<Conversation> {
    const conversation = await this.conversationRepo.findById(id)

    if (!conversation) {
      throw new NotFoundError('对话不存在')
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenError('无权修改此对话')
    }

    return this.conversationRepo.update(id, { title })
  }

  async getMessages(
    conversationId: string,
    userId: string,
    page: number,
    limit: number
  ): Promise<{ messages: Message[]; total: number }> {
    const conversation = await this.conversationRepo.findById(conversationId)

    if (!conversation) {
      throw new NotFoundError('对话不存在')
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenError('无权访问此对话')
    }

    const skip = (page - 1) * limit
    return this.conversationRepo.getMessages(conversationId, skip, limit)
  }

  async clearMessages(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.conversationRepo.findById(conversationId)

    if (!conversation) {
      throw new NotFoundError('对话不存在')
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenError('无权清空此对话')
    }

    await this.conversationRepo.clearMessages(conversationId)
  }

  private generateDefaultTitle(type: ConversationType): string {
    const titles: Record<ConversationType, string> = {
      CHAT: '新对话',
      SEARCH: '医学搜索',
      REPORT: '体检报告解读',
      DRUG: '药品查询',
    }
    return titles[type]
  }
}
