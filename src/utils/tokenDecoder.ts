import { TOKEN_PARTS_COUNT, TOKEN_USERID_FIELD } from '@/types/constants'

export function decodeToken(token: string): {
  userid: string
  name?: string
  account?: string
} {
  const splits = token.split('.')

  if (splits.length !== TOKEN_PARTS_COUNT) {
    throw new Error(`Token must contain ${TOKEN_PARTS_COUNT} parts (format: part1.part2.part3)`)
  }

  try {
    const part = splits[1]
    if (!part) {
      throw new Error('Invalid token structure')
    }
    const padding = '='.repeat((4 - (part.length % 4)) % 4)
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/') + padding

    // 使用正确的 UTF-8 解码
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const decoded = new TextDecoder('utf-8').decode(bytes)
    const params = JSON.parse(decoded)

    if (!(TOKEN_USERID_FIELD in params)) {
      throw new Error(`Token does not contain ${TOKEN_USERID_FIELD} field`)
    }

    return params
  } catch (error) {
    throw new Error(`Failed to decode token: ${error}`)
  }
}

export function getStudentId(token: string): string {
  const params = decodeToken(token)
  return params[TOKEN_USERID_FIELD]
}

export function getUserInfo(token: string): {
  studentId: string
  name?: string
  account?: string
} {
  const params = decodeToken(token)

  // Debug: 打印解码后的用户信息
  console.log(
    'User info decoded - name:',
    params.name,
    'account:',
    params.account,
    'userid:',
    params.userid,
  )

  return {
    studentId: params[TOKEN_USERID_FIELD],
    name: params.name,
    account: params.account,
  }
}
