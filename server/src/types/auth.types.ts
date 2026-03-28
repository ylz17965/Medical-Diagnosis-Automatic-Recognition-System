import { z } from 'zod'

export const registerSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '无效的手机号'),
  password: z.string()
    .min(8, '密码至少8位')
    .regex(/[A-Z]/, '密码需包含大写字母')
    .regex(/[a-z]/, '密码需包含小写字母')
    .regex(/[0-9]/, '密码需包含数字'),
  code: z.string().length(6, '验证码为6位数字'),
  nickname: z.string().min(2).max(20).optional(),
})

export const loginSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '无效的手机号').optional(),
  email: z.string().email('无效的邮箱').optional(),
  password: z.string().min(6).optional(),
  code: z.string().length(6).optional(),
}).refine((data) => {
  if (!data.phone && !data.email) {
    return false
  }
  if (data.email && !data.password) {
    return false
  }
  if (data.phone && !data.code) {
    return false
  }
  return true
}, { message: '请提供手机号+验证码或邮箱+密码' })

export const sendCodeSchema = z.object({
  target: z.string(),
  type: z.enum(['phone', 'email']),
  purpose: z.enum(['register', 'login', 'reset_password']),
})

export const resetPasswordSchema = z.object({
  email: z.string().email('无效的邮箱'),
  code: z.string().length(6, '验证码为6位数字'),
  newPassword: z.string()
    .min(8, '密码至少8位')
    .regex(/[A-Z]/, '密码需包含大写字母')
    .regex(/[a-z]/, '密码需包含小写字母')
    .regex(/[0-9]/, '密码需包含数字'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: '两次密码不一致',
  })

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
})

export const userResponseSchema = z.object({
  id: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  nickname: z.string(),
  avatarUrl: z.string().nullable(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DELETED']),
  createdAt: z.string(),
})
