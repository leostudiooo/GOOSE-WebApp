/**
 * 隐私化处理工具函数
 * 对敏感信息进行脱敏处理
 */

/**
 * 隐私化姓名 - 显示第一个字符，其余用*代替
 * 例如：李柃锋 -> 李**
 */
export function maskName(name: string): string {
  if (!name || name.length === 0) {
    return ''
  }
  if (name.length === 1) {
    return name
  }
  if (name.length === 2) {
    return name[0] + '*'
  }
  return name[0] + '*'.repeat(name.length - 1)
}

/**
 * 隐私化一卡通号 - 显示前3位和后2位，中间用*代替
 * 例如：213233089 -> 213***89
 */
export function maskAccount(account: string): string {
  if (!account || account.length < 5) {
    return account
  }
  const prefix = account.slice(0, 3)
  const suffix = account.slice(-2)
  const masked = '*'.repeat(account.length - 5)
  return prefix + masked + suffix
}

/**
 * 隐私化学生ID - 显示前4位和后4位，中间用*代替
 * 例如：392522683303065115 -> 3925***65115
 */
export function maskStudentId(studentId: string): string {
  if (!studentId || studentId.length < 8) {
    return studentId
  }
  const prefix = studentId.slice(0, 4)
  const suffix = studentId.slice(-4)
  const masked = '*'.repeat(studentId.length - 8)
  return prefix + masked + suffix
}

/**
 * 隐私化手机号 - 显示前3位和后4位，中间用*代替
 * 例如：13812345678 -> 138****5678
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length !== 11) {
    return phone
  }
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

/**
 * 隐私化邮箱 - 显示前2个字符和@后面的域名
 * 例如：example@email.com -> ex***@email.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return email
  }
  const [localPart, domain] = email.split('@')
  if (localPart.length <= 2) {
    return email
  }
  return localPart.slice(0, 2) + '***' + '@' + domain
}

/**
 * 格式化隐私化用户信息
 * 根据信息类型自动选择合适的隐私化方法
 */
export function maskUserInfo(value: string, type: 'name' | 'account' | 'studentId' | 'phone' | 'email'): string {
  switch (type) {
    case 'name':
      return maskName(value)
    case 'account':
      return maskAccount(value)
    case 'studentId':
      return maskStudentId(value)
    case 'phone':
      return maskPhone(value)
    case 'email':
      return maskEmail(value)
    default:
      return value
  }
}

/**
 * 获取隐私化的完整用户信息
 * 用于显示在界面上
 */
export function getMaskedUserInfo(params: {
  name?: string
  account?: string
  studentId?: string
  phone?: string
  email?: string
}): {
  maskedName?: string
  maskedAccount?: string
  maskedStudentId?: string
  maskedPhone?: string
  maskedEmail?: string
} {
  const result: {
    maskedName?: string
    maskedAccount?: string
    maskedStudentId?: string
    maskedPhone?: string
    maskedEmail?: string
  } = {}
  
  if (params.name) {
    result.maskedName = maskName(params.name)
  }
  if (params.account) {
    result.maskedAccount = maskAccount(params.account)
  }
  if (params.studentId) {
    result.maskedStudentId = maskStudentId(params.studentId)
  }
  if (params.phone) {
    result.maskedPhone = maskPhone(params.phone)
  }
  if (params.email) {
    result.maskedEmail = maskEmail(params.email)
  }
  
  return result
}