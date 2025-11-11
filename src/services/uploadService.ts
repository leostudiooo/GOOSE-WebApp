import { APIClient } from './api'
import { VerificationService } from './verificationService'
import type { User, Route, Track } from '@/types'
import { buildStartRecord, buildFinishRecord } from '@/utils/recordBuilder'
import { RECORD_STATUS_FINISHED } from '@/types/constants'

type ToastCallback = (message: string, type: 'info' | 'success' | 'error') => void

export interface UploadProgress {
  step: string
  completed: boolean
  error?: string
}

export interface UploadResult {
  success: boolean
  error?: string
  recordId?: string
}

export class UploadService {
  private verificationService: VerificationService
  private onProgress?: (progress: UploadProgress) => void
  private toastCallback?: ToastCallback

  constructor(onProgress?: (progress: UploadProgress) => void, toastCallback?: ToastCallback) {
    this.verificationService = new VerificationService(toastCallback)
    this.onProgress = onProgress
    this.toastCallback = toastCallback
  }

  private updateProgress(step: string, completed: boolean, error?: string) {
    this.onProgress?.({ step, completed, error })
  }

  async uploadExerciseRecord(
    apiClient: APIClient,
    studentId: string,
    user: User,
    route: Route,
    track: Track,
    startImageFile: File,
    finishImageFile: File,
  ): Promise<UploadResult> {
    try {
      this.toastCallback?.('开始上传运动记录...', 'info')
      this.updateProgress('Starting upload', false)

      this.toastCallback?.('正在上传图片...', 'info')
      this.updateProgress('Uploading start image', false)
      const startImageUrl = await apiClient.uploadStartImage(startImageFile)

      this.updateProgress('Start image uploaded', true)
      this.updateProgress('Uploading finish image', false)
      const finishImageUrl = await apiClient.uploadFinishImage(finishImageFile)
      this.toastCallback?.('图片上传完成', 'success')

      this.updateProgress('Finish image uploaded', true)

      this.toastCallback?.('正在创建运动记录...', 'info')
      this.updateProgress('Creating start record', false)

      const startRecord = buildStartRecord(route, user.dateTime, startImageUrl, studentId)

      const recordId = await apiClient.uploadStartRecord(startRecord)

      this.updateProgress('Start record created', true)
      this.updateProgress('Creating finish record', false)

      const finishRecord = buildFinishRecord(
        startRecord,
        finishImageUrl,
        track,
        recordId,
        RECORD_STATUS_FINISHED,
      )

      await apiClient.uploadFinishRecord(finishRecord)
      this.toastCallback?.('运动记录提交完成！', 'success')

      this.updateProgress('Finish record uploaded', true)
      this.updateProgress('Upload completed successfully', true)

      return { success: true, recordId }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      this.toastCallback?.(errorMessage, 'error')
      this.updateProgress('Upload failed', false, errorMessage)
      return { success: false, error: errorMessage }
    }
  }
}
