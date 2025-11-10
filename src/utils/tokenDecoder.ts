import { TOKEN_PARTS_COUNT, TOKEN_USERID_FIELD } from '@/types/constants'

export function decodeToken(token: string): { userid: string } {
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
    const decoded = atob(base64)
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
