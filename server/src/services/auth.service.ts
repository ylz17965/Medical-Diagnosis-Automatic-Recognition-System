import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { FastifyInstance } from 'fastify'
import { UserRepository } from '../repositories/user.repository.js'
import { TokenRepository } from '../repositories/token.repository.js'
import { config } from '../config/index.js'
import { 
  ConflictError, 
  UnauthorizedError, 
  ValidationError,
  NotFoundError 
} from '../middleware/error-handler.middleware.js'

const SALT_ROUNDS = 12

interface UserResponse {
  id: string
  phone: string
  email?: string | null
  nickname: string
  avatarUrl?: string | null
  status: string
  createdAt: Date
}

interface TokenPayload {
  userId: string
  phone: string
  email?: string
}

export class AuthService {
  private tokenRepo: TokenRepository

  constructor(
    private userRepo: UserRepository,
    private fastify: FastifyInstance
  ) {
    this.tokenRepo = new TokenRepository(fastify.prisma)
  }

  async register(data: {
    phone: string
    password: string
    code: string
    nickname?: string
  }): Promise<{
    user: UserResponse
    accessToken: string
    refreshToken: string
  }> {
    const existingUser = await this.userRepo.findByPhone(data.phone)
    if (existingUser) {
      throw new ConflictError('该手机号已注册')
    }

    const isValidCode = await this.verifyCode(data.phone, data.code, 'REGISTER')
    if (!isValidCode) {
      throw new ValidationError('验证码无效或已过期')
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS)
    const nickname = data.nickname || `用户${data.phone.slice(-4)}`

    const user = await this.userRepo.create({
      phone: data.phone,
      passwordHash,
      nickname,
    })

    const { accessToken, refreshToken } = await this.generateTokens({
      userId: user.id,
      phone: user.phone,
      email: user.email || undefined,
    })
    
    await this.tokenRepo.createRefreshToken({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    }
  }

  async login(data: { phone: string; password: string }): Promise<{
    user: UserResponse
    accessToken: string
    refreshToken: string
  }> {
    const user = await this.userRepo.findByPhone(data.phone)
    if (!user) {
      throw new UnauthorizedError('手机号或密码错误')
    }

    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash)
    if (!isValidPassword) {
      throw new UnauthorizedError('手机号或密码错误')
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('账号已被禁用')
    }

    await this.userRepo.updateLastLogin(user.id)

    const { accessToken, refreshToken } = await this.generateTokens({
      userId: user.id,
      phone: user.phone,
      email: user.email || undefined,
    })
    
    await this.tokenRepo.createRefreshToken({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    }
  }

  async loginWithCode(data: { phone: string; code: string }): Promise<{
    user: UserResponse
    accessToken: string
    refreshToken: string
  }> {
    const user = await this.userRepo.findByPhone(data.phone)
    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    const isValidCode = await this.verifyCode(data.phone, data.code, 'LOGIN')
    if (!isValidCode) {
      throw new ValidationError('验证码无效或已过期')
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('账号已被禁用')
    }

    await this.userRepo.updateLastLogin(user.id)

    const { accessToken, refreshToken } = await this.generateTokens({
      userId: user.id,
      phone: user.phone,
      email: user.email || undefined,
    })
    
    await this.tokenRepo.createRefreshToken({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string
    refreshToken: string
    user: UserResponse
  }> {
    const storedToken = await this.tokenRepo.findRefreshToken(refreshToken)
    
    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token无效或已过期')
    }

    const user = await this.userRepo.findById(storedToken.userId)
    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    const { accessToken, refreshToken: newRefreshToken } = await this.generateTokens({
      userId: user.id,
      phone: user.phone,
      email: user.email || undefined,
    })
    
    await this.tokenRepo.revokeRefreshToken(refreshToken)
    await this.tokenRepo.createRefreshToken({
      token: newRefreshToken,
      userId: storedToken.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: this.sanitizeUser(user),
    }
  }

  async sendVerificationCode(data: { 
    target: string
    type: 'PHONE' | 'EMAIL'
    purpose: 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD' 
  }): Promise<{ success: boolean; message: string; code?: string }> {
    const code = Math.random().toString().slice(-6)
    
    await this.fastify.prisma.verificationCode.create({
      data: {
        target: data.target,
        code,
        type: data.type,
        purpose: data.purpose,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    })

    if (config.isDev) {
      console.log(`[DEV] 验证码已发送到 ${data.target}: ${code}`)
      return { success: true, message: '验证码已发送', code }
    }

    return { success: true, message: '验证码已发送' }
  }

  async resetPassword(data: { phone: string; code: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepo.findByPhone(data.phone)
    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    const isValidCode = await this.verifyCode(data.phone, data.code, 'RESET_PASSWORD')
    if (!isValidCode) {
      throw new ValidationError('验证码无效或已过期')
    }

    const passwordHash = await bcrypt.hash(data.newPassword, SALT_ROUNDS)
    await this.userRepo.update(user.id, { passwordHash })
    
    await this.tokenRepo.revokeAllUserTokens(user.id)

    return { success: true, message: '密码重置成功' }
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.tokenRepo.revokeRefreshToken(refreshToken)
    } else {
      await this.tokenRepo.revokeAllUserTokens(userId)
    }
  }

  private async verifyCode(target: string, code: string, purpose: string): Promise<boolean> {
    const storedCode = await this.fastify.prisma.verificationCode.findFirst({
      where: {
        target,
        code,
        purpose: purpose as any,
        used: false,
        expiresAt: { gt: new Date() },
      },
    })

    if (!storedCode) {
      return false
    }

    await this.fastify.prisma.verificationCode.update({
      where: { id: storedCode.id },
      data: { used: true },
    })

    return true
  }

  private async generateTokens(payload: TokenPayload): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = jwt.sign(
      { 
        userId: payload.userId,
        phone: payload.phone,
        email: payload.email,
      },
      config.jwt.secret,
      { expiresIn: '15m' }
    )

    const refreshToken = jwt.sign(
      { 
        userId: payload.userId, 
        phone: payload.phone,
        email: payload.email,
        type: 'refresh' 
      },
      config.jwt.secret,
      { expiresIn: '7d' }
    )

    return { accessToken, refreshToken }
  }

  private sanitizeUser(user: { 
    id: string
    phone: string
    email?: string | null
    nickname: string
    avatarUrl?: string | null
    status: string
    passwordHash: string
    createdAt: Date
  }): UserResponse {
    const { passwordHash, ...userWithoutPassword } = user
    return userWithoutPassword as UserResponse
  }
}
