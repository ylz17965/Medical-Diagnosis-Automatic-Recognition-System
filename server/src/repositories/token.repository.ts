import { PrismaClient } from '@prisma/client'
import type { User, RefreshToken } from '@prisma/client'

export class TokenRepository {
  constructor(private prisma: PrismaClient) {}

  async createRefreshToken(data: {
    token: string
    userId: string
    expiresAt: Date
  }): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({
      data,
    })
  }

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    })
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { token },
      data: { revoked: true },
    })
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    })
  }

  async deleteExpiredTokens(): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revoked: true },
        ],
      },
    })
  }
}
