import bcrypt from 'bcrypt'
import { UserRepository } from '../repositories/user.repository.js'
import { NotFoundError, ValidationError, ConflictError } from '../middleware/error-handler.middleware.js'

const SALT_ROUNDS = 12

export class UserService {
  constructor(private userRepo: UserRepository) {}

  async getUserById(id: string) {
    const user = await this.userRepo.findById(id)
    if (!user) {
      throw new NotFoundError('用户不存在')
    }
    return this.sanitizeUser(user)
  }

  async updateProfile(id: string, data: { nickname?: string; email?: string }) {
    if (data.email) {
      const existingUser = await this.userRepo.findByEmail(data.email)
      if (existingUser && existingUser.id !== id) {
        throw new ConflictError('该邮箱已被使用')
      }
    }

    const user = await this.userRepo.update(id, data)
    return this.sanitizeUser(user)
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepo.findById(id)
    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValidPassword) {
      throw new ValidationError('当前密码错误')
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
    await this.userRepo.update(id, { passwordHash })
  }

  async deleteAccount(id: string) {
    await this.userRepo.update(id, { status: 'DELETED' as any })
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...userWithoutPassword } = user
    return userWithoutPassword
  }
}
