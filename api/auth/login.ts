import type { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { phone, password } = req.body

  if (!phone || !password) {
    return res.status(400).json({ 
      success: false, 
      error: { message: '手机号和密码不能为空' } 
    })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { phone }
    })

    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ 
        success: false, 
        error: { message: '手机号或密码错误' } 
      })
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ 
        success: false, 
        error: { message: '账号已被禁用' } 
      })
    }

    const accessToken = generateToken()
    const refreshToken = generateToken()

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
    })

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          status: user.status,
          createdAt: user.createdAt.toISOString(),
        },
        accessToken,
        refreshToken,
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ 
      success: false, 
      error: { message: '登录失败，请稍后重试' } 
    })
  }
}
