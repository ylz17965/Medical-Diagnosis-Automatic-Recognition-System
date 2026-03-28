import { PrismaClient } from '@prisma/client'
import type { User, UserStatus } from '@prisma/client'

export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    phone: string
    passwordHash: string
    nickname: string
    email?: string
    avatarUrl?: string
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        phone: data.phone,
        passwordHash: data.passwordHash,
        nickname: data.nickname,
        email: data.email,
        avatarUrl: data.avatarUrl,
      },
    })
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    })
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { phone },
    })
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    })
  }

  async update(id: string, data: Partial<{
    nickname: string
    email: string
    avatarUrl: string
    passwordHash: string
    emailVerified: boolean
    phoneVerified: boolean
    status: UserStatus
    lastLoginAt: Date
  }>): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    })
  }

  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    })
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    })
  }
}
