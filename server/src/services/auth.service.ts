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
  }) {
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

    const { accessToken, refreshToken } = await this.generateTokens(user.id)
    
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

  async login(data: { phone: string; password: string }) {
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

    const { accessToken, refreshToken } = await this.generateTokens(user.id)
    
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

  async loginWithCode(data: { phone: string; code: string }) {
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

    const { accessToken, refreshToken } = await this.generateTokens(user.id)
    
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

  async refreshAccessToken(refreshToken: string) {
    const storedToken = await this.tokenRepo.findRefreshToken(refreshToken)
    
    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token无效或已过期')
    }

    const { accessToken, refreshToken: newRefreshToken } = await this.generateTokens(storedToken.userId)
    
    await this.tokenRepo.revokeRefreshToken(refreshToken)
    await this.tokenRepo.createRefreshToken({
      token: newRefreshToken,
      userId: storedToken.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    return {
      accessToken,
      refreshToken: newRefreshToken,
    }
  }

  async sendVerificationCode(data: { target: string; type: 'PHONE' | 'EMAIL'; purpose: 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD' }) {
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
    }

    return { success: true, message: '验证码已发送' }
  }

  async resetPassword(data: { phone: string; code: string; newPassword: string }) {
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

  private async generateTokens(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = jwt.sign(
      { userId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    )

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn }
    )

    return { accessToken, refreshToken }
  }

  private sanitizeUser(user: User) {
    const { passwordHash, ...userWithoutPassword } = user
    return userWithoutPassword
  }
}

import { User } from '@prisma/client'
