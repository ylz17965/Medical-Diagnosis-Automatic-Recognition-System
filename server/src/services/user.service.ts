import bcrypt from 'bcrypt'
import { UserRepository } from '../repositories/user.repository.js'
import { NotFoundError, ValidationError, ConflictError } from '../middleware/error-handler.middleware.js'

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

export class UserService {
  constructor(private userRepo: UserRepository) {}

  async getUserById(id: string): Promise<UserResponse> {
    const user = await this.userRepo.findById(id)
    if (!user) {
      throw new NotFoundError('用户不存在')
    }
    return this.sanitizeUser(user)
  }

  async updateProfile(id: string, data: { nickname?: string; email?: string; avatarUrl?: string }): Promise<UserResponse> {
    if (data.email) {
      const existingUser = await this.userRepo.findByEmail(data.email)
      if (existingUser && existingUser.id !== id) {
        throw new ConflictError('该邮箱已被使用')
      }
    }

    const user = await this.userRepo.update(id, data)
    return this.sanitizeUser(user)
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findById(id)
    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValidPassword) {
      throw new ValidationError('当前密码错误')
    }

    if (currentPassword === newPassword) {
      throw new ValidationError('新密码不能与当前密码相同')
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
    await this.userRepo.update(id, { passwordHash })
  }

  async deleteAccount(id: string): Promise<void> {
    const user = await this.userRepo.findById(id)
    if (!user) {
      throw new NotFoundError('用户不存在')
    }
    
    await this.userRepo.update(id, { status: 'DELETED' as any })
  }

  async uploadAvatar(userId: string, buffer: Buffer, mimeType: string): Promise<string> {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(mimeType)) {
      throw new ValidationError('不支持的图片格式')
    }

    const maxSize = 2 * 1024 * 1024
    if (buffer.length > maxSize) {
      throw new ValidationError('头像文件大小不能超过 2MB')
    }

    const base64 = buffer.toString('base64')
    const avatarUrl = `data:${mimeType};base64,${base64}`

    await this.userRepo.update(userId, { avatarUrl })

    return avatarUrl
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
