<template>
  <div class="home-view">
    <div class="content-wrapper">
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
          <button @click="handleValidation" class="upload-btn validation-btn" :disabled="!canValidate">
            验证配置
          </button>
          <button @click="handleUpload" class="upload-btn upload-btn-main" :disabled="!canUpload">
            上传记录
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
import type { Track } from '@/types'

const configStore = useConfigStore()
const userStore = useUserStore()
const routeStore = useRouteStore()
const showPRTSTracker = ref(false)
const theme = ref<'light' | 'dark' | 'auto'>('auto')

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
function handleValidation() {
  if (!canValidate.value) return

  // Simple validation feedback
  const missing = []
  if (!userStore.user.token) missing.push('Token')
  if (!userStore.user.route) missing.push('运动场地')

  if (missing.length > 0) {
    alert(`❌ 配置不完整，缺少: ${missing.join(', ')}`)
  } else {
    alert('✅ 配置验证通过！')
  }
}

// Handle upload
function handleUpload() {
  if (!canUpload.value) return

  // Check what's missing for upload
  const missing = []
  if (!userStore.user.token) missing.push('Token')
  if (!userStore.startImageFile) missing.push('开始图片')
  if (!userStore.finishImageFile) missing.push('结束图片')
  if (!userStore.user.route) missing.push('运动场地')

  if (missing.length > 0) {
    alert(`❌ 无法上传，缺少: ${missing.join(', ')}`)
  } else {
    // TODO: Implement actual upload logic
    alert('🚀 开始上传记录...\n\n(上传功能尚未实现)')
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
function handleImportTrack(track: Track, suggestions?: Record<string, unknown>) {
  // Enable custom track
  userStore.enableCustomTrack(track)

  // Show success message
  let message = `✅ 自定义轨迹绘制完成！\n📍 共 ${track.track.length} 个点\n📏 距离: ${track.metadata.formattedDistance}\n⏱️ 预计时间: ${track.metadata.formattedTime}`

  if (suggestions && suggestions.suggestedTime) {
    const suggestedTime = new Date(String(suggestions.suggestedTime))
    message += `\n💡 建议: 设置锻炼时间为 ${suggestedTime.toLocaleString()}`
  }

  alert(message)

  // Hide PRTS tracker
  showPRTSTracker.value = false
}

</script>

<style scoped>
.home-view {
  min-height: 100vh;
  width: 100%;
  background: var(--color-background);
  color: var(--color-text);
  box-sizing: border-box;
  padding-left: 20px;
  padding-right: 20px;
}

.content-wrapper {
  min-height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
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
  padding-bottom: 0;
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
  .content-wrapper {
    padding: 30px 15px;
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
  .content-wrapper {
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
  .content-wrapper {
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
  .content-wrapper {
    padding: 40px 50px;
  }

  .main-content {
    padding: 0 30px;
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

</style>
