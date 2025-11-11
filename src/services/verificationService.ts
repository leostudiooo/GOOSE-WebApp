import { APIClient } from './api'
import { getUserInfo } from '@/utils/tokenDecoder'
import { getMaskedUserInfo } from '@/utils/privacyHelper'
import type { Headers, User } from '@/types'

export interface VerificationResult {
  isValid: boolean
  error?: string
  studentId?: string
  name?: string
  account?: string
}

export class VerificationService {
  private apiClient: APIClient | null = null

  async verifyToken(token: string, headers: Headers): Promise<VerificationResult> {
    try {
      this.apiClient = new APIClient(headers, token)
      
      await this.apiClient.checkToken()
      
      const userInfo = getUserInfo(token)
      
      // 获取隐私化后的用户信息
      const maskedInfo = getMaskedUserInfo({
        name: userInfo.name,
        account: userInfo.account,
        studentId: userInfo.studentId
      })
      
      return {
        isValid: true,
        studentId: maskedInfo.maskedStudentId,
        name: maskedInfo.maskedName,
        account: maskedInfo.maskedAccount
      }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Token verification failed'
      }
    }
  }

  async verifyTenant(tenant: string, headers: Headers, token: string): Promise<VerificationResult> {
    try {
      this.apiClient = new APIClient(headers, token)
      
      await this.apiClient.checkTenant(tenant)
      
      return {
        isValid: true
      }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Tenant verification failed'
      }
    }
  }

  async validateUserConfig(user: User, headers: Headers): Promise<VerificationResult> {
    if (!user.token) {
      return {
        isValid: false,
        error: 'Token is required'
      }
    }

    if (!user.route) {
      return {
        isValid: false,
        error: 'Route selection is required'
      }
    }

    if (!user.startImage) {
      return {
        isValid: false,
        error: 'Start image is required'
      }
    }

    if (!user.finishImage) {
      return {
        isValid: false,
        error: 'Finish image is required'
      }
    }

    const tokenResult = await this.verifyToken(user.token, headers)
    if (!tokenResult.isValid) {
      return tokenResult
    }

    const tenantResult = await this.verifyTenant(headers.tenant, headers, user.token)
    if (!tenantResult.isValid) {
      return tenantResult
    }

    return {
      isValid: true,
      studentId: tokenResult.studentId,
      name: tokenResult.name,
      account: tokenResult.account
    }
  }

  getApiClient(): APIClient | null {
    return this.apiClient
  }
}