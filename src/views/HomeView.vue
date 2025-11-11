<template>
  <div class="home-view">
    <div class="app-window">
      <div class="titlebar">
        <div class="window-controls">
          <div class="traffic-lights">
            <span class="traffic-light close"></span>
            <span class="traffic-light minimize"></span>
            <span class="traffic-light maximize"></span>
          </div>
        </div>
        <div class="titlebar-center">
          <span class="logo-emoji">🪿</span>
          <span class="title">GOOSE</span>
        </div>
        <button
          @click="toggleTheme"
          class="theme-toggle"
          :title="isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'"
        >
          {{ isDark ? '☀️' : '🌙' }}
        </button>
      </div>

      <div class="window-content">
        <div class="content-columns">
          <div class="column config-column">
            <UserConfigForm />
          </div>
          <div class="column upload-column">
            <Transition name="component-fade" mode="out-in">
              <TrackSelector
                v-if="!showPRTSTracker"
                key="track-selector"
                @showPRTS="handleShowPRTS"
              />
              <div v-else key="prts-tracker" class="prts-wrapper">
                <PRTSTracker
                  :route-name="userStore.user.route"
                  :load-route-boundary="loadRouteBoundary"
                  @close="handleClosePRTS"
                  @importTrack="handleImportTrack"
                />
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- Upload controls at bottom of window -->
      <div class="upload-controls">
        <button
          @click="handleValidation"
          class="upload-btn validation-btn"
          :disabled="!canValidate || isValidating"
        >
          {{ isValidating ? '验证中...' : '验证配置' }}
        </button>
        <button
          @click="handleUpload"
          class="upload-btn upload-btn-main"
          :disabled="!canUpload || isUploading"
        >
          {{ isUploading ? '上传中...' : '上传记录' }}
        </button>
      </div>
    </div>

    <footer class="footer">
      <p>
        基于 <a href="https://github.com/leostudiooo/GOOSE" target="_blank">GOOSE</a>、<a href="https://github.com/leostudiooo/PRTS" target="_blank">PRTS</a> 和 <a href="https://github.com/midairlogn/ml-seu-exercise-helper" target="_blank">ML-SEU-Exercise-Helper</a> 开发 |
        <a href="https://opensource.org/licenses/GPL-3.0" target="_blank">GPL-3.0 License</a>
      </p>
      <p class="warning">
        ⚠️ 本软件按"原样"提供，不附带任何担保。用户应对其上传的数据承担全部责任。
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useConfigStore } from '@/stores/config'
import { useUserStore } from '@/stores/user'
import { useRouteStore } from '@/stores/route'
import UserConfigForm from '@/components/UserConfigForm.vue'
import TrackSelector from '@/components/TrackSelector.vue'
import PRTSTracker from '@/components/PRTSTracker.vue'
import { loadRouteBoundary } from '@/utils/boundaryLoader'
import { VerificationService } from '@/services/verificationService'
import { UploadService, type UploadProgress } from '@/services/uploadService'
import { APIClient } from '@/services/api'
import { useToast } from 'vue-toastification'
import type { Track } from '@/types'
import { getMaskedUserInfo } from '@/utils/privacyHelper'

const configStore = useConfigStore()
const userStore = useUserStore()
const routeStore = useRouteStore()
const toast = useToast()
const showPRTSTracker = ref(false)
const theme = ref<'light' | 'dark' | 'auto'>('auto')
const isValidating = ref(false)
const isUploading = ref(false)
const uploadProgress = ref<UploadProgress | null>(null)
const validationResult = ref<string>('')
const isTokenValidated = ref(false) // 跟踪 token 是否已成功验证
const validatedApiClient = ref<APIClient | null>(null) // 存储已验证的 API client
const validatedStudentId = ref<string>('') // 存储已验证的学生ID

// 监听 token 变化，重置验证状态
watch(
  () => userStore.user.token,
  () => {
    isTokenValidated.value = false
    validationResult.value = ''
    validatedApiClient.value = null
    validatedStudentId.value = ''
  },
)

const isDark = computed(() => {
  if (theme.value === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return theme.value === 'dark'
})

function toggleTheme() {
  if (theme.value === 'auto' || theme.value === 'light') {
    theme.value = 'dark'
  } else {
    theme.value = 'light'
  }
  updateTheme()
}

function updateTheme() {
  const root = document.documentElement
  if (theme.value === 'dark') {
    root.setAttribute('data-theme', 'dark')
  } else if (theme.value === 'light') {
    root.setAttribute('data-theme', 'light')
  } else {
    root.removeAttribute('data-theme')
  }
  localStorage.setItem('theme', theme.value)
}

function handleShowPRTS() {
  console.log('HomeView: Received showPRTS event')
  showPRTSTracker.value = true
}

function handleClosePRTS() {
  showPRTSTracker.value = false
}

// Computed properties for button states
const canValidate = computed(() => {
  // 验证配置只需要 token
  return !!userStore.user.token
})

const canUpload = computed(() => {
  // 上传需要所有字段完整
  const hasBasicFields =
    userStore.user.token &&
    userStore.startImageFile &&
    userStore.finishImageFile &&
    userStore.user.route

  // 如果启用了自定义轨迹，还需要有轨迹数据
  const hasTrackData = userStore.user.customTrack.enable ? !!userStore.customTrackData : true // 默认轨迹不需要额外检查

  // 必须已经成功验证过 token
  return hasBasicFields && hasTrackData && isTokenValidated.value
})

// Handle validation
async function handleValidation() {
  if (!canValidate.value || isValidating.value) return

  isValidating.value = true
  validationResult.value = ''

  try {
    if (!configStore.headers) {
      throw new Error('配置未加载')
    }

    const verificationService = new VerificationService((message, type) => {
      if (type === 'info') toast.info(message)
      else if (type === 'success') toast.success(message)
      else if (type === 'error') toast.error(message)
    })

    const result = await verificationService.validateTokenOnly(userStore.user, configStore.headers)

    if (result.isValid) {
      isTokenValidated.value = true // 标记为已验证

      // 保存验证结果，供上传时复用
      validatedApiClient.value = verificationService.getApiClient()
      validatedStudentId.value = result.studentId || ''

      let successMessage = '配置验证通过！用户信息：'
      // 使用 masked data 显示敏感信息
      const maskedInfo = getMaskedUserInfo({
        name: result.name || '',
        account: result.account || '',
        studentId: result.studentId || '',
      })
      if (maskedInfo.maskedName) {
        successMessage += `\n${maskedInfo.maskedName}`
      }
      if (maskedInfo.maskedAccount) {
        successMessage += `\n${maskedInfo.maskedAccount}`
      }
      if (maskedInfo.maskedStudentId) {
        successMessage += `\n${maskedInfo.maskedStudentId}`
      }
      validationResult.value = successMessage
      // 验证成功时不再单独显示 toast，因为已经在验证过程中显示了
    } else {
      isTokenValidated.value = false // 验证失败时重置状态
      validationResult.value = `验证失败: ${result.error}`
      toast.error(validationResult.value)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '验证过程中发生错误'
    validationResult.value = `验证失败: ${errorMessage}`
    toast.error(validationResult.value)
  } finally {
    isValidating.value = false
  }
}

// Handle upload
async function handleUpload() {
  if (!canUpload.value || isUploading.value) return

  // 检查 token 是否已验证
  if (!isTokenValidated.value) {
    toast.error('请先验证配置')
    return
  }

  // 上传前再次检查所有必需字段
  if (!userStore.user.token) {
    toast.error('请先填写 Token')
    return
  }

  if (!userStore.user.route) {
    toast.error('请选择运动场馆')
    return
  }

  if (!userStore.startImageFile) {
    toast.error('请上传开始图片')
    return
  }

  if (!userStore.finishImageFile) {
    toast.error('请上传结束图片')
    return
  }

  // 检查是否有轨迹数据
  if (userStore.user.customTrack.enable && !userStore.customTrackData) {
    toast.error('请上传轨迹文件或绘制自定义轨迹')
    return
  }

  isUploading.value = true
  uploadProgress.value = null

  try {
    // 检查是否有缓存的验证信息
    if (!validatedApiClient.value) {
      throw new Error('API client 未初始化')
    }

    const uploadService = new UploadService(
      (progress) => {
        uploadProgress.value = progress
      },
      (message, type) => {
        if (type === 'info') toast.info(message)
        else if (type === 'success') toast.success(message)
        else if (type === 'error') toast.error(message)
      },
    )

    // Get the selected route
    const selectedRoute = routeStore.routes.find((r) => r.routeName === userStore.user.route)
    if (!selectedRoute) {
      throw new Error('未找到选定的运动场地')
    }

    // Get track data
    let trackData: Track
    if (userStore.user.customTrack.enable && userStore.customTrackData) {
      trackData = userStore.customTrackData
    } else {
      // Load default track for the route
      // This would need to be implemented based on your track loading logic
      throw new Error('暂不支持默认轨迹，请使用自定义轨迹')
    }

    const result = await uploadService.uploadExerciseRecord(
      validatedApiClient.value as APIClient,
      validatedStudentId.value,
      userStore.user,
      selectedRoute,
      trackData,
      userStore.startImageFile!,
      userStore.finishImageFile!,
    )

    if (result.success) {
      toast.success(`上传成功！记录ID: ${result.recordId}`)
    } else {
      toast.error(`上传失败: ${result.error}`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '上传过程中发生错误'
    toast.error(`上传失败: ${errorMessage}`)
  } finally {
    isUploading.value = false
    uploadProgress.value = null
  }
}

// Watch for changes to debug
watch(showPRTSTracker, (newVal) => {
  console.log('HomeView: showPRTSTracker changed to:', newVal)
})

onMounted(async () => {
  // Load saved theme
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'auto' | null
  if (savedTheme) {
    theme.value = savedTheme
  }
  updateTheme()

  await configStore.loadHeaders()
  await routeStore.loadRoutes()
})

// Handle PRTS events
function handleImportTrack(track: Track) {
  // Enable custom track
  userStore.enableCustomTrack(track)

  // Show success message
  const message = `自定义轨迹绘制完成！\n采样：${track.track.length} 个点\n距离：${track.metadata.formattedDistance}\n时间：${track.metadata.formattedTime}`

  toast.success(message)

  // Hide PRTS tracker
  showPRTSTracker.value = false
}
</script>

<style scoped>
.home-view {
  height: 100vh;
  width: 100%;
  background: var(--color-background);
  color: var(--color-text);
  box-sizing: border-box;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-window {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-subtle);
  border-radius: 12px;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 4px 8px rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
  transition: all 0.4s ease;
  min-height: 0;
  max-height: 100%;
}

.titlebar {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 15px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border-subtle);
  min-height: 32px;
  position: relative;
}

.titlebar-center {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  font-size: 14px;
  font-weight: bold;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  color: var(--color-text);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.theme-toggle {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  background: var(--color-surface-interactive);
  border: 1px solid var(--color-border-subtle);
  border-radius: 6px;
  color: var(--color-text);
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  min-width: 28px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-toggle:hover {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-background);
}

.window-controls {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
}

.traffic-lights {
  display: flex;
  gap: 8px;
}

.traffic-light {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.traffic-light.close {
  background: #ff5f57;
  border: 1px solid #e0443e;
}

.traffic-light.minimize {
  background: #ffbd2e;
  border: 1px solid #dea123;
}

.traffic-light.maximize {
  background: #28ca42;
  border: 1px solid #1aad29;
}

.logo-emoji {
  font-size: 14px;
  line-height: 1;
}

.window-content {
  width: 100%;
  padding: 20px;
  box-sizing: border-box;
  flex: 1;
  background: var(--color-background);
  overflow-y: auto;
  min-height: 0;
}

.content-columns {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 1400px;
  margin: 0 auto;
  transition: all 0.4s ease;
}

.column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
  transition: all 0.4s ease;
}

.config-column > * {
  background: var(--color-surface);
  padding: 0;
  margin: 0;
}

.upload-column > .prts-wrapper,
.upload-column > .track-selector {
  background: var(--color-surface);
  padding: 0;
  margin: 0;
}

.footer {
  text-align: center;
  color: var(--color-text-muted);
  font-size: 11px;
  max-width: 2000px;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  padding: 20px;
  flex-shrink: 0;
}

.footer p {
  margin: 8px 0;
}

.footer a {
  color: var(--color-primary);
  text-decoration: none;
}

.footer a:hover {
  text-decoration: underline;
}

.warning {
  color: var(--color-text-muted);
  font-size: 10px;
  margin-top: 5px;
}

@media (min-width: 768px) {
  .home-view {
    padding: 30px;
  }

  .logo {
    width: 80px;
    height: 80px;
    margin-bottom: 15px;
  }

  h1 {
    font-size: 28px;
  }

  .subtitle {
    font-size: 14px;
  }

  .main-content {
    padding: 0 20px;
  }

  .content-columns {
    gap: 30px;
  }

  .column {
    gap: 30px;
  }

  .footer {
    font-size: 13px;
  }

  .warning {
    font-size: 12px;
  }
}

@media (min-width: 1024px) {
  .home-view {
    padding: 20px;
  }

  .logo {
    width: 100px;
    height: 100px;
  }

  h1 {
    font-size: 32px;
    margin-bottom: 10px;
  }

  .subtitle {
    font-size: 16px;
  }

  .content-columns {
    flex-direction: row;
    gap: 35px;
    align-items: flex-start;
  }

  .config-column {
    flex: 0 0 450px;
    max-width: 450px;
  }

  .upload-column {
    flex: 1;
    min-width: 0;
  }

  .footer {
    font-size: 14px;
  }
}

@media (min-width: 1280px) {
  .home-view {
    padding: 40px 30px;
  }

  .content-columns {
    gap: 45px;
    max-width: 1600px;
  }

  .config-column {
    flex: 0 0 500px;
    max-width: 500px;
  }
}

@media (min-width: 1600px) {
  .content-columns {
    gap: 55px;
    max-width: 1800px;
  }

  .config-column {
    flex: 0 0 550px;
    max-width: 550px;
  }
}

@media (min-width: 2000px) {
  .home-view {
    padding: 40px 50px;
  }

  .content-columns {
    max-width: 2000px;
  }
}

/* PRTS Tracker Section - Directly integrated as a new component area */
/* PRTS Tracker as component in right column */
.prts-wrapper {
  margin: 0;
  padding: 0;
  background: var(--color-surface);
  overflow: hidden;
}

/* Ensure column children have no extra margins */
.config-column > *:not(:last-child) {
  margin-bottom: 0;
}

.upload-column > * {
  margin: 0;
}

/* Component fade transition */
.component-fade-enter-active,
.component-fade-leave-active {
  transition: opacity 0.3s ease;
}

.component-fade-enter-from,
.component-fade-leave-to {
  opacity: 0;
}

/* Upload controls at bottom of window */
.upload-controls {
  padding: 15px 20px;
  border-top: 1px solid var(--color-border-subtle);
  background: var(--color-surface-raised);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.upload-btn {
  padding: 10px 16px;
  border: 1px solid var(--color-border-subtle);
  background: var(--color-surface-interactive);
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.2s;
  min-width: 80px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.validation-btn {
  background: var(--tui-primary);
  border-color: var(--tui-primary);
  color: var(--color-background);
}

.validation-btn:hover:not(:disabled) {
  background: var(--color-background);
  color: var(--tui-primary);
}

.upload-btn-main {
  background: var(--tui-success);
  border-color: var(--tui-success);
  color: var(--color-background);
}

.upload-btn-main:hover:not(:disabled) {
  background: var(--color-background);
  color: var(--tui-success);
}

.upload-btn:disabled {
  background: var(--color-text-muted);
  border-color: var(--color-text-muted);
  color: var(--color-background);
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
