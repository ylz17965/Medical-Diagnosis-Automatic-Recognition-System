import { PrismaClient } from '@prisma/client'

type ConversationType = 'CHAT' | 'SEARCH' | 'REPORT' | 'DRUG'
type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM'

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
  role: MessageRole
  content: string
  sources?: string | null
  createdAt: Date
}

export class ConversationRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Conversation | null> {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    }) as Promise<Conversation | null>
  }

  async findMany(
    userId: string,
    skip: number,
    take: number,
    type?: ConversationType
  ): Promise<{ conversations: Conversation[]; total: number }> {
    const where = {
      userId,
      ...(type && { type }),
    }

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.conversation.count({ where }),
    ])

    return { conversations: conversations as Conversation[], total }
  }

  async create(data: {
    userId: string
    type: ConversationType
    title: string
  }): Promise<Conversation> {
    return this.prisma.conversation.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
      },
    }) as Promise<Conversation>
  }

  async update(id: string, data: { title?: string }): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id },
      data,
    }) as Promise<Conversation>
  }

  async delete(id: string): Promise<void> {
    await this.prisma.conversation.delete({
      where: { id },
    })
  }

  async getMessages(
    conversationId: string,
    skip: number,
    take: number
  ): Promise<{ messages: Message[]; total: number }> {
    const where = { conversationId }

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.message.count({ where }),
    ])

    return { messages: messages as Message[], total }
  }

  async clearMessages(conversationId: string): Promise<void> {
    await this.prisma.message.deleteMany({
      where: { conversationId },
    })
  }
}
