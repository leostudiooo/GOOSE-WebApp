import { APIClient } from './api'
import { getUserInfo } from '@/utils/tokenDecoder'
import type { Headers, User } from '@/types'

type ToastCallback = (message: string, type: 'info' | 'success' | 'error') => void

export interface VerificationResult {
  isValid: boolean
  error?: string
  studentId?: string
  name?: string
  account?: string
}

export class VerificationService {
  private apiClient: APIClient | null = null
  private toastCallback?: ToastCallback

  constructor(toastCallback?: ToastCallback) {
    this.toastCallback = toastCallback
  }

  async verifyToken(token: string, headers: Headers): Promise<VerificationResult> {
    try {
      this.apiClient = new APIClient(headers, token)
      
      await this.apiClient.checkToken()
      
      const userInfo = getUserInfo(token)
      
      return {
        isValid: true,
        studentId: userInfo.studentId,  // 返回原始 studentId 用于 API 认证
        name: userInfo.name,
        account: userInfo.account
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

  // 只验证 token 的轻量级验证，用于配置验证
  async validateTokenOnly(user: User, headers: Headers): Promise<VerificationResult> {
    this.toastCallback?.('检查 Token...', 'info')
    
    if (!user.token) {
      this.toastCallback?.('Token 未填写', 'error')
      return {
        isValid: false,
        error: 'Token is required'
      }
    }

    this.toastCallback?.('正在验证用户身份...', 'info')
    const tokenResult = await this.verifyToken(user.token, headers)
    if (!tokenResult.isValid) {
      this.toastCallback?.('Token 验证失败', 'error')
      return tokenResult
    }

    const tenantResult = await this.verifyTenant(headers.tenant, headers, user.token)
    if (!tenantResult.isValid) {
      this.toastCallback?.('租户验证失败', 'error')
      return tenantResult
    }

    this.toastCallback?.('身份验证完成！', 'success')
    return {
      isValid: true,
      studentId: tokenResult.studentId,
      name: tokenResult.name,
      account: tokenResult.account
    }
  }

  // 验证所有上传必需的字段
  async validateUserConfig(user: User, headers: Headers): Promise<VerificationResult> {
    this.toastCallback?.('检查必填字段...', 'info')
    
    if (!user.token) {
      this.toastCallback?.('Token 未填写', 'error')
      return {
        isValid: false,
        error: 'Token is required'
      }
    }

    if (!user.route) {
      this.toastCallback?.('请选择运动场馆', 'error')
      return {
        isValid: false,
        error: 'Route selection is required'
      }
    }

    if (!user.startImage) {
      this.toastCallback?.('请上传开始图片', 'error')
      return {
        isValid: false,
        error: 'Start image is required'
      }
    }

    if (!user.finishImage) {
      this.toastCallback?.('请上传结束图片', 'error')
      return {
        isValid: false,
        error: 'Finish image is required'
      }
    }

    this.toastCallback?.('正在验证用户身份...', 'info')
    const tokenResult = await this.verifyToken(user.token, headers)
    if (!tokenResult.isValid) {
      this.toastCallback?.('Token 验证失败', 'error')
      return tokenResult
    }

    const tenantResult = await this.verifyTenant(headers.tenant, headers, user.token)
    if (!tenantResult.isValid) {
      this.toastCallback?.('租户验证失败', 'error')
      return tenantResult
    }

    this.toastCallback?.('身份验证完成！', 'success')
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