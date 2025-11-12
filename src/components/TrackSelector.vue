<template>
  <div class="track-selector">
    <h3>[ 轨迹选择 ]</h3>
    <div class="track-content">
      <div class="radio-group">
        <label class="radio-option">
          <input
            type="radio"
            name="trackType"
            value="default"
            v-model="trackType"
            @change="useDefaultTrack"
          />
          <span class="radio-label">使用默认轨迹</span>
        </label>
        <label class="radio-option">
          <input
            type="radio"
            name="trackType"
            value="custom"
            v-model="trackType"
            @change="enableCustom"
          />
          <span class="radio-label">使用自定义轨迹</span>
        </label>
      </div>

      <div v-if="userStore.user.customTrack.enable" class="custom-track-options">
        <!-- Draw Tool Button - Always visible when custom track is enabled -->
        <div class="draw-tool-section">
          <span class="draw-tool-hint">绘制新轨迹或编辑现有轨迹</span>
          <button @click="openPRTSDrawer" class="btn-draw-large" :disabled="isLoadingBoundary">
            <span v-if="isLoadingBoundary">🔄 加载中...</span>
            <span v-else>🎨 打开绘图工具</span>
          </button>
        </div>

        <!-- Upload Section -->
        <div class="upload-section">
          <div
            class="upload-area"
            @drop.prevent="handleDrop"
            @dragover.prevent="handleDragOver"
            @dragenter.prevent="handleDragEnter"
            @dragleave.prevent="handleDragLeave"
            :class="{ 'drag-over': isDragOver }"
          >
            <input
              id="track-file"
              type="file"
              accept="application/json,.json"
              @change="handleTrackFile"
              class="file-input"
            />

            <!-- Show upload interface when no track loaded -->
            <label v-if="!userStore.customTrackData" for="track-file" class="upload-label">
              <div class="upload-placeholder">
                <span>📁</span>
                <p>轨迹文件</p>
                <small>点击选择或拖拽 JSON 文件到此处</small>
              </div>
            </label>

            <!-- Show track info when track is loaded -->
            <div v-else class="track-loaded">
              <div class="track-info-display">
                <span class="track-icon">🏟️</span>
                <div class="track-details">
                  <p class="track-name">{{ trackFileName || '已加载轨迹' }}</p>
                  <small class="track-stats">
                    {{ userStore.customTrackData.track.length }} 个点 ·
                    {{ userStore.customTrackData.metadata.formattedDistance }}
                  </small>
                </div>
                <button @click="clearCustomTrack" class="btn-clear-compact" title="清除轨迹">
                  🗑️ 清除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import type { Track } from '@/types'

const userStore = useUserStore()
const trackFileName = ref<string>('')
const isLoadingBoundary = ref(false)
const isDragOver = ref<boolean>(false)
let dragCounter = 0

// localStorage key for auto-loading PRTS tracks (same as PRTSTracker)
const PRTS_PATH_STORAGE_KEY = 'goose_prts_path_points'

// Emit events
const emit = defineEmits<{
  showPRTS: []
  importTrack: [track: Track, suggestions?: Record<string, unknown>]
}>()

// Computed property to track current track type
const trackType = computed(() => {
  return userStore.user.customTrack.enable ? 'custom' : 'default'
})

function useDefaultTrack() {
  console.log('TrackSelector: Switching to default track')
  userStore.disableCustomTrack()
  trackFileName.value = ''
}

function enableCustom() {
  console.log('TrackSelector: Switching to custom track')
  // Enable custom track mode
  if (!userStore.user.customTrack.enable) {
    // Only enable if not already enabled
    userStore.user.customTrack.enable = true
  }
}

function openPRTSDrawer() {
  console.log('TrackSelector: Opening PRTS drawer')
  console.log('TrackSelector: Current track type:', trackType.value)
  console.log('TrackSelector: Custom track enabled:', userStore.user.customTrack.enable)
  emit('showPRTS')
  console.log('TrackSelector: showPRTS event emitted')
}

// Auto-load PRTS track from localStorage
function loadPRTSTrackFromStorage() {
  try {
    const saved = localStorage.getItem(PRTS_PATH_STORAGE_KEY)
    if (!saved) return false

    const saveData = JSON.parse(saved)
    if (
      !saveData.pathPoints ||
      !Array.isArray(saveData.pathPoints) ||
      saveData.pathPoints.length === 0
    ) {
      return false
    }

    // Convert PRTS path points to Track format
    const trackPoints = saveData.pathPoints.map(
      (point: { lat: number; lng: number; sortNum: number }, index: number) => ({
        lat: point.lat,
        lng: point.lng,
        sortNum: index + 1,
      }),
    )

    // Calculate basic metadata
    let totalDistance = 0
    for (let i = 1; i < trackPoints.length; i++) {
      const prev = trackPoints[i - 1]
      const curr = trackPoints[i]
      totalDistance += calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng)
    }

    const sampleInterval = saveData.sampleTimeInterval || 10
    const totalTime = (trackPoints.length - 1) * sampleInterval

    const metadata = {
      totalDistance,
      formattedDistance:
        totalDistance < 1000
          ? `${totalDistance.toFixed(0)} m`
          : `${(totalDistance / 1000).toFixed(2)} km`,
      totalTime,
      formattedTime:
        totalTime >= 60
          ? `${Math.floor(totalTime / 60)} 分 ${totalTime % 60} 秒`
          : `${totalTime} 秒`,
      sampleTimeInterval: sampleInterval,
      pointCount: trackPoints.length,
      createdAt: saveData.savedAt || new Date().toISOString(),
    }

    const track: Track = {
      track: trackPoints,
      metadata,
    }

    // Auto-enable custom track with loaded data
    userStore.enableCustomTrack(track)
    trackFileName.value = `本地轨迹 (${new Date(metadata.createdAt).toLocaleString()})`

    console.log(
      'TrackSelector: Auto-loaded PRTS track from localStorage:',
      trackPoints.length,
      'points',
    )
    return true
  } catch (error) {
    console.warn('TrackSelector: Failed to load PRTS track from localStorage:', error)
    return false
  }
}

// Simple distance calculation (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

// Lifecycle
onMounted(async () => {
  console.log('TrackSelector: Component mounted')

  // Ensure custom track mode is enabled by default
  if (!userStore.user.customTrack.enable) {
    console.log('TrackSelector: Enabling custom track mode by default')
    userStore.user.customTrack.enable = true
  }

  // Try to auto-load PRTS track from localStorage
  const loaded = loadPRTSTrackFromStorage()
  if (loaded) {
    console.log('TrackSelector: Auto-loaded saved PRTS track')
  }
})

async function handleTrackFile(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    await processTrackFile(file)
  }
}

async function processTrackFile(file: File) {
  if (file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
    try {
      const text = await file.text()
      const track: Track = JSON.parse(text)

      if (!track.track || !Array.isArray(track.track)) {
        throw new Error('Invalid track format')
      }

      userStore.enableCustomTrack(track)
      trackFileName.value = file.name
    } catch (error) {
      alert('无效的轨迹文件格式')
      console.error('Track file error:', error)
    }
  } else {
    alert('请选择有效的 JSON 轨迹文件')
  }
}

// 防止默认行为的通用函数
function preventDefaults(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
}

// Drag and drop handlers
function handleDrop(event: DragEvent) {
  preventDefaults(event)
  dragCounter = 0
  isDragOver.value = false

  const files = event.dataTransfer?.files
  if (files && files[0] && files[0].name.endsWith('.json')) {
    processTrackFile(files[0])
  }
}

function handleDragOver(event: DragEvent) {
  preventDefaults(event)
}

function handleDragEnter(event: DragEvent) {
  preventDefaults(event)
  dragCounter++
  if (dragCounter === 1) {
    isDragOver.value = true
  }
}

function handleDragLeave(event: DragEvent) {
  preventDefaults(event)
  dragCounter--
  if (dragCounter === 0) {
    isDragOver.value = false
  }
}

// Clear custom track and localStorage
function clearCustomTrack() {
  if (confirm('确定要清除当前自定义轨迹吗？这也会清除本地存储的轨迹数据。')) {
    userStore.disableCustomTrack()
    trackFileName.value = ''

    // Also clear localStorage
    try {
      localStorage.removeItem(PRTS_PATH_STORAGE_KEY)
      console.log('TrackSelector: Cleared custom track and localStorage')
    } catch (error) {
      console.warn('TrackSelector: Failed to clear localStorage:', error)
    }
  }
}
</script>

<style scoped>
.track-selector {
  padding: 0;
  background: var(--color-surface);
  margin-top: 0;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
}

.track-content {
  padding: 15px;
}

@media (min-width: 640px) {
  .track-content {
    padding: 20px;
  }

  h3 {
    font-size: 20px;
    padding: 18px 25px 15px;
  }

  .radio-option {
    padding: 15px 18px;
  }

  .radio-label {
    font-size: 15px;
  }

  .custom-track-inner {
    padding: 16px;
  }

  .invitation-text {
    font-size: 16px;
  }

  .radio-option {
    padding: 18px 22px;
  }

  .custom-track-options {
    margin: 35px 0;
    padding: 0;
  }

  .custom-track-inner {
    padding: 35px;
  }

  .prts-invitation {
    padding: 35px;
  }

  .invitation-text {
    padding: 0 20px;
    margin-bottom: 35px;
  }

  .action-buttons {
    padding: 25px 20px;
    gap: 35px;
    margin: 0 -15px;
  }

  .btn-draw-large {
    padding: 20px 36px;
    margin: 8px;
  }

  .upload-button-large {
    padding: 18px 34px;
    margin: 8px;
  }

  .option-divider-vertical {
    padding: 20px 25px;
  }

  .track-info {
    padding: 25px;
    margin: 20px;
  }
}

h3 {
  font-size: 18px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-text);
  text-align: center;
  margin: 0 0 15px 0;
  padding: 15px 20px 12px;
  background: var(--color-surface-raised);
  border-bottom: 1px solid var(--color-border-subtle);
}

.radio-group {
  margin-bottom: 15px;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-option {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  margin-bottom: 8px;
}

.radio-option:hover {
  background-color: var(--color-surface-interactive);
}

.radio-option input[type='radio'] {
  margin-right: 15px;
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--color-primary);
}

.radio-option input[type='radio']:checked ~ .radio-label {
  font-weight: bold;
  color: var(--color-primary);
}

.radio-option:has(input[type='radio']:checked) {
  background-color: var(--color-surface);
  border-color: var(--color-primary);
  border-width: 2px;
}

.radio-label {
  font-size: 14px;
  color: var(--color-text);
  user-select: none;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
}

.custom-track-options {
  margin: 20px 0;
  padding: 20px;
  background: var(--color-surface-raised);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.draw-tool-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

@media (max-width: 640px) {
  .draw-tool-section {
    flex-direction: column;
    gap: 12px;
  }
}

.draw-tool-hint {
  margin: 0;
  font-size: 14px;
  color: var(--color-text);
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  white-space: nowrap;
  text-align: center;
}

@media (max-width: 640px) {
  .draw-tool-hint {
    white-space: normal;
    text-align: center;
    line-height: 1.3;
  }
}

.btn-draw-large {
  padding: 12px 24px;
  background: var(--color-primary);
  color: var(--color-background);
  border: 1px solid var(--color-primary);
  cursor: pointer;
  font-size: 13px;
  font-weight: bold;
  transition: all 0.2s;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.btn-draw-large:hover:not(:disabled) {
  background: var(--color-background);
  color: var(--color-primary);
}

.btn-draw-large:disabled {
  background: var(--color-text-muted);
  border-color: var(--color-text-muted);
  color: var(--color-background);
  cursor: not-allowed;
  opacity: 0.5;
}

.upload-section {
  width: 100%;
}

.upload-area {
  position: relative;
  border: 2px dashed var(--color-border-subtle);
  background: var(--color-surface);
  transition: all 0.3s ease;
  min-height: 100px;
  margin: 15px 0;
}

.upload-area:hover {
  border-color: var(--color-primary);
  background: var(--color-surface-interactive);
  border-style: dashed;
}

.upload-area.drag-over {
  border-color: var(--tui-primary);
  border-style: solid;
  background: var(--tui-primary-bg);
  color: var(--color-text);
}

.upload-area.drag-over .upload-label,
.upload-area.drag-over .upload-help,
.upload-area.drag-over .upload-placeholder,
.upload-area.drag-over .upload-placeholder p,
.upload-area.drag-over .upload-placeholder small,
.upload-area.drag-over .track-loaded,
.upload-area.drag-over .track-info-display,
.upload-area.drag-over .track-name,
.upload-area.drag-over .track-points {
  color: white !important;
}

.upload-label {
  display: flex;
  cursor: pointer;
  min-height: 100px;
  align-items: center;
  justify-content: center;
  padding: 20px;
  transition: background-color 0.2s;
  width: 100%;
}

.upload-placeholder {
  text-align: center;
  color: var(--color-text-muted);
}

.upload-placeholder span {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
}

.upload-placeholder p {
  margin: 0 0 4px 0;
  font-size: 12px;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: bold;
}

.upload-placeholder small {
  font-size: 10px;
  color: var(--color-text-muted);
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
}

.track-loaded {
  padding: 20px;
  display: flex;
  align-items: center;
  min-height: 100px;
}

.track-info-display {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.track-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.track-details {
  flex: 1;
  min-width: 0;
}

.track-name {
  margin: 0 0 2px 0;
  font-size: 12px;
  font-weight: bold;
  color: var(--color-success);
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.track-stats {
  font-size: 10px;
  color: var(--color-text-muted);
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  margin: 0;
}

.btn-clear-compact {
  padding: 6px 8px;
  background: var(--tui-danger);
  border: 1px solid var(--tui-danger);
  color: var(--color-background);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-clear-compact:hover {
  background: var(--color-background);
  color: var(--tui-danger);
}

.option-group {
  margin-bottom: 15px;
}

.option-group:last-child {
  margin-bottom: 0;
}

.btn-draw {
  display: inline-block;
  padding: 10px 20px;
  background: var(--color-primary);
  color: var(--color-background);
  border: 1px solid var(--color-primary);
  cursor: pointer;
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 8px;
  transition: all 0.2s;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.btn-draw:hover {
  background: var(--color-background);
  color: var(--color-primary);
}

.btn-draw:disabled {
  background: var(--color-text-muted);
  border-color: var(--color-text-muted);
  color: var(--color-background);
  cursor: not-allowed;
  opacity: 0.5;
}

.option-divider {
  text-align: center;
  margin: 15px 0;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  position: relative;
}

.option-divider::before,
.option-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 40%;
  height: 1px;
  background: #ddd;
}

.option-divider::before {
  left: 0;
}

.option-divider::after {
  right: 0;
}

/* PRTS invitation styling */
.prts-invitation {
  background: var(--color-surface);
  padding: 30px;
  margin: 25px 0;
  background: var(--color-surface-interactive);
}

.invitation-text {
  text-align: center;
  font-size: 15px;
  color: var(--color-text);
  margin: 0 0 15px 0;
  padding: 0 8px;
  font-weight: bold;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
}

.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
  padding: 10px;
  margin: 0 -5px;
}

.btn-draw-large {
  padding: 12px 20px;
  background: var(--color-primary);
  color: var(--color-background);
  border: 1px solid var(--color-primary);
  cursor: pointer;
  font-size: 13px;
  font-weight: bold;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 3px;
}

.btn-draw-large:hover {
  background: var(--color-background);
  color: var(--color-primary);
}

.btn-draw-large:disabled {
  background: var(--color-text-muted);
  border-color: var(--color-text-muted);
  color: var(--color-background);
  cursor: not-allowed;
  opacity: 0.5;
}

.option-divider-vertical {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: bold;
  padding: 8px 12px;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  text-transform: uppercase;
  align-self: center;
}

.file-input {
  display: none;
}

.upload-button {
  display: inline-block;
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border-radius: 4px;
  cursor: pointer;
}

.upload-button:hover {
  background: #0056b3;
}

.file-name {
  margin-top: 12px;
  padding: 8px 12px;
  font-size: 11px;
  color: var(--color-text-muted);
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  word-break: break-all;
  text-align: center;
  max-width: 200px;
}

small {
  display: block;
  margin-top: 10px;
  color: #666;
  font-size: 12px;
}
</style>
