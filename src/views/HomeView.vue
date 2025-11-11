<template>
  <div class="home-view">
    <div class="app-window">
        <div class="titlebar">
          <div class="titlebar-center">
            <span class="logo-emoji">🪿</span>
            <span class="title">GOOSE</span>
          </div>
          <button @click="toggleTheme" class="theme-toggle" :title="isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'">
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
                <TrackSelector v-if="!showPRTSTracker"
                  key="track-selector"
                  @showPRTS="handleShowPRTS" />
                <div v-else
                  key="prts-tracker"
                  class="prts-wrapper">
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
          <button @click="handleValidation" class="upload-btn validation-btn" :disabled="!canValidate || isValidating">
            {{ isValidating ? '验证中...' : '验证配置' }}
          </button>
          <button @click="handleUpload" class="upload-btn upload-btn-main" :disabled="!canUpload || isUploading">
            {{ isUploading ? '上传中...' : '上传记录' }}
          </button>
        </div>
      </div>

    <footer class="footer">
      <p>
        基于 <a href="https://github.com/leostudiooo/GOOSE" target="_blank">GOOSE</a> 项目开发
        | GPL-3.0 License
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
import { useToast } from 'vue-toastification'
import type { Track, TrackPoint } from '@/types'

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
  return userStore.user.token && userStore.user.route
})

const canUpload = computed(() => {
  return (
    userStore.user.token &&
    userStore.startImageFile &&
    userStore.finishImageFile &&
    userStore.user.route
  )
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

    const verificationService = new VerificationService()

    const result = await verificationService.validateUserConfig(
      userStore.user,
      configStore.headers
    )

    if (result.isValid) {
      let successMessage = '配置验证通过！用户信息：'
      if (result.name) {
        successMessage += `\n${result.name}`
      }
      if (result.account) {
        successMessage += `\n${result.account}`
      }
      if (result.studentId) {
        successMessage += `\n${result.studentId}`
      }
      validationResult.value = successMessage
      toast.success(successMessage)
    } else {
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

  isUploading.value = true
  uploadProgress.value = null

  try {
    const uploadService = new UploadService((progress) => {
      uploadProgress.value = progress
    })

    // Get the selected route
    const selectedRoute = routeStore.routes.find(r => r.routeName === userStore.user.route)
    if (!selectedRoute) {
      throw new Error('未找到选定的运动场地')
    }

    if (!configStore.headers) {
      throw new Error('配置未加载')
    }

    // Get track data
    let trackData: TrackPoint[] = []
    if (userStore.user.customTrack.enable && userStore.customTrackData) {
      trackData = userStore.customTrackData.track
    } else {
      // Load default track for the route
      // This would need to be implemented based on your track loading logic
      trackData = [] // Placeholder
    }

    const result = await uploadService.uploadExerciseRecord(
      userStore.user,
      configStore.headers,
      selectedRoute,
      trackData
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
  border: 2px solid var(--color-border);
  background: var(--color-background);
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
  border-bottom: 1px solid var(--color-border);
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
  font-family: 'Courier New', monospace;
  color: var(--color-text);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.theme-toggle {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  font-family: 'Courier New', monospace;
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
  border: 2px solid var(--color-border);
  padding: 0;
  margin: 0;
}

.upload-column > .prts-wrapper,
.upload-column > .track-selector {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  padding: 0;
  margin: 0;
}

.footer {
  text-align: center;
  color: var(--color-text-muted);
  font-size: 11px;
  max-width: 2000px;
  font-family: 'Courier New', monospace;
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
  border: 2px solid var(--color-border);
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
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.upload-btn {
  padding: 10px 16px;
  border: 2px solid;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
  font-family: 'Courier New', monospace;
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

/* Custom scrollbar styles - Main window content */
.window-content::-webkit-scrollbar {
  width: 16px;
  background: var(--color-surface);
}

.window-content::-webkit-scrollbar-track {
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  border-radius: 0;
}

.window-content::-webkit-scrollbar-thumb {
  background: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: 0;
  min-height: 30px;
  background-clip: padding-box;
}

.window-content::-webkit-scrollbar-thumb:hover {
  background: var(--color-text);
  border-color: var(--color-border);
}

.window-content::-webkit-scrollbar-thumb:active {
  background: var(--color-primary);
  border-color: var(--color-border);
}

.window-content::-webkit-scrollbar-corner {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

/* Custom scrollbar for other scrollable elements */
.prts-wrapper::-webkit-scrollbar,
.config-column > *::-webkit-scrollbar,
.upload-column > *::-webkit-scrollbar {
  width: 12px;
  background: var(--color-surface);
}

.prts-wrapper::-webkit-scrollbar-track,
.config-column > *::-webkit-scrollbar-track,
.upload-column > *::-webkit-scrollbar-track {
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  border-radius: 0;
}

.prts-wrapper::-webkit-scrollbar-thumb,
.config-column > *::-webkit-scrollbar-thumb,
.upload-column > *::-webkit-scrollbar-thumb {
  background: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: 0;
  min-height: 24px;
  background-clip: padding-box;
}

.prts-wrapper::-webkit-scrollbar-thumb:hover,
.config-column > *::-webkit-scrollbar-thumb:hover,
.upload-column > *::-webkit-scrollbar-thumb:hover {
  background: var(--color-text);
  border-color: var(--color-border);
}

.prts-wrapper::-webkit-scrollbar-thumb:active,
.config-column > *::-webkit-scrollbar-thumb:active,
.upload-column > *::-webkit-scrollbar-thumb:active {
  background: var(--color-primary);
  border-color: var(--color-border);
}

.prts-wrapper::-webkit-scrollbar-corner,
.config-column > *::-webkit-scrollbar-corner,
.upload-column > *::-webkit-scrollbar-corner {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

/* Firefox scrollbar */
.window-content {
  scrollbar-width: thin;
  scrollbar-color: var(--color-text-muted) var(--color-surface);
}

.prts-wrapper,
.config-column > *,
.upload-column > * {
  scrollbar-width: thin;
  scrollbar-color: var(--color-text-muted) var(--color-surface);
}

</style>
