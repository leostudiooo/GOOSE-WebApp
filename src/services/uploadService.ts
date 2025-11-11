import { APIClient } from './api'
import { VerificationService } from './verificationService'
import type { Headers, User, Route, StartRecord, TrackPoint } from '@/types'
import { buildStartRecord, buildFinishRecord } from '@/utils/recordBuilder'
import { RECORD_STATUS_FINISHED } from '@/types/constants'

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

  constructor(onProgress?: (progress: UploadProgress) => void) {
    this.verificationService = new VerificationService()
    this.onProgress = onProgress
  }

  private updateProgress(step: string, completed: boolean, error?: string) {
    this.onProgress?.({ step, completed, error })
  }


  async uploadExerciseRecord(
    user: User,
    headers: Headers,
    route: Route,
    track: TrackPoint[],
    startImageFile: File,
    finishImageFile: File
  ): Promise<UploadResult> {
    try {
      this.updateProgress('Validating configuration', false)
      
      const validationResult = await this.verificationService.validateUserConfig(user, headers)
      if (!validationResult.isValid) {
        this.updateProgress('Validation failed', false, validationResult.error)
        return { success: false, error: validationResult.error }
      }

      const apiClient = this.verificationService.getApiClient()
      if (!apiClient) {
        throw new Error('API client not initialized')
      }

      this.updateProgress('Validation completed', true)
      this.updateProgress('Uploading start image', false)

      const startImageUrl = await apiClient.uploadStartImage(startImageFile)

      this.updateProgress('Start image uploaded', true)
      this.updateProgress('Uploading finish image', false)

      const finishImageUrl = await apiClient.uploadFinishImage(finishImageFile)

      this.updateProgress('Finish image uploaded', true)
      this.updateProgress('Creating start record', false)

      const startRecord = buildStartRecord(
        route,
        user.dateTime,
        startImageUrl,
        finishImageUrl,
        track,
        validationResult.studentId!
      )

      const recordId = await apiClient.uploadStartRecord(startRecord)

      this.updateProgress('Start record created', true)
      this.updateProgress('Creating finish record', false)

      const finishRecord = buildFinishRecord(
        startRecord,
        recordId,
        RECORD_STATUS_FINISHED
      )

      await apiClient.uploadFinishRecord(finishRecord)

      this.updateProgress('Finish record uploaded', true)
      this.updateProgress('Upload completed successfully', true)

      return { success: true, recordId }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      this.updateProgress('Upload failed', false, errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  async uploadImages(
    startImageFile: File,
    finishImageFile: File,
    apiClient: APIClient
  ): Promise<{ startImageUrl: string; finishImageUrl: string }> {
    this.updateProgress('Uploading start image', false)
    
    const startImageUrl = await apiClient.uploadStartImage(startImageFile)
    
    this.updateProgress('Start image uploaded', true)
    this.updateProgress('Uploading finish image', false)
    
    const finishImageUrl = await apiClient.uploadFinishImage(finishImageFile)
    
    this.updateProgress('Finish image uploaded', true)
    
    return { startImageUrl, finishImageUrl }
  }

  async uploadRecords(
    startRecord: StartRecord,
    apiClient: APIClient
  ): Promise<string> {
    this.updateProgress('Creating start record', false)
    
    const recordId = await apiClient.uploadStartRecord(startRecord)
    
    this.updateProgress('Start record created', true)
    this.updateProgress('Creating finish record', false)
    
    const finishRecord = buildFinishRecord(
      startRecord,
      recordId,
      RECORD_STATUS_FINISHED
    )
    
    await apiClient.uploadFinishRecord(finishRecord)
    
    this.updateProgress('Finish record uploaded', true)
    
    return recordId
  }
}