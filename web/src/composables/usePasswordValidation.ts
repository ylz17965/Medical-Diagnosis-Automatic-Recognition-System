import { computed, ref } from 'vue'

export type PasswordStrength = 'weak' | 'medium' | 'strong' | 'very-strong'

export interface PasswordValidationResult {
  isValid: boolean
  strength: PasswordStrength
  score: number
  errors: string[]
  checks: {
    length: boolean
    lowercase: boolean
    uppercase: boolean
    number: boolean
    special: boolean
  }
}

const defaultOptions = {
  minLength: 8,
  requireLowercase: true,
  requireUppercase: true,
  requireNumber: true,
  requireSpecial: false,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
}

export function usePasswordValidation(options: Partial<typeof defaultOptions> = {}) {
  const config = { ...defaultOptions, ...options }
  const password = ref('')

  const validate = (value: string): PasswordValidationResult => {
    const errors: string[] = []
    const checks = {
      length: value.length >= config.minLength,
      lowercase: !config.requireLowercase || /[a-z]/.test(value),
      uppercase: !config.requireUppercase || /[A-Z]/.test(value),
      number: !config.requireNumber || /[0-9]/.test(value),
      special: !config.requireSpecial || new RegExp(`[${config.specialChars}]`).test(value)
    }

    if (!checks.length) {
      errors.push(`密码长度至少${config.minLength}位`)
    }
    if (!checks.lowercase) {
      errors.push('包含小写字母')
    }
    if (!checks.uppercase) {
      errors.push('包含大写字母')
    }
    if (!checks.number) {
      errors.push('包含数字')
    }
    if (!checks.special) {
      errors.push('包含特殊字符')
    }

    const score = Object.values(checks).filter(Boolean).length
    let strength: PasswordStrength = 'weak'
    if (score >= 5) strength = 'very-strong'
    else if (score >= 4) strength = 'strong'
    else if (score >= 3) strength = 'medium'

    return {
      isValid: errors.length === 0,
      strength,
      score,
      errors,
      checks
    }
  }

  const result = computed(() => validate(password.value))

  const getStrengthLabel = (strength: PasswordStrength): string => {
    const labels: Record<PasswordStrength, string> = {
      'weak': '弱',
      'medium': '中等',
      'strong': '强',
      'very-strong': '非常强'
    }
    return labels[strength]
  }

  const getStrengthColor = (strength: PasswordStrength): string => {
    const colors: Record<PasswordStrength, string> = {
      'weak': 'var(--color-error)',
      'medium': 'var(--color-warning)',
      'strong': 'var(--color-success)',
      'very-strong': 'var(--color-primary)'
    }
    return colors[strength]
  }

  return {
    password,
    result,
    validate,
    getStrengthLabel,
    getStrengthColor,
    config
  }
}
