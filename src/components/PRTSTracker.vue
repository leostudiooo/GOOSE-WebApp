<template>
  <div class="prts-tracker-content">
    <div class="prts-header">
      <h3>[ PRTS — 自定义轨迹规划 ]</h3>
      <button @click="$emit('close')" class="close-btn btn-compact">关闭</button>
    </div>
    <div class="prts-toolbar">
      <div class="toolbar-section">
        <label>采样间隔 (秒):</label>
        <input
          type="number"
          v-model.number="sampleTimeInterval"
          min="1"
          max="60"
          class="time-input"
        />
      </div>

      <div class="toolbar-section stats">
        <span class="stat">{{ formattedDistance }}</span>
        <span class="stat">{{ formattedTime }}</span>
        <span class="stat">{{ pathPoints.length }} 点</span>
      </div>

      <div class="toolbar-section actions">
        <button @click="clearPoints" class="btn btn-warning btn-compact">清除</button>
        <button
          @click="exportAsJSON"
          class="btn btn-info btn-compact"
          :disabled="pathPoints.length === 0"
          title="导出为JSON文件"
        >
          💾
        </button>
        <button @click="exportToGOOSE" class="btn btn-success btn-compact">完成绘制</button>
      </div>
    </div>

    <div class="prts-main">
      <div class="map-container">
        <canvas
          ref="mapCanvas"
          @click="handleCanvasClick"
          @mousemove="handleCanvasMouseMove"
          @mouseleave="handleCanvasMouseLeave"
          class="map-canvas"
        ></canvas>
      </div>

      <div class="points-panel">
        <div class="panel-header">
          <h4>路径点列表</h4>
          <small v-if="pathPoints.length > 0 && userStore.customTrackData" class="edit-hint">
            正在编辑现有轨迹
          </small>
        </div>

        <div class="points-list">
          <div
            v-for="(point, index) in sortedPathPoints"
            :key="index"
            class="point-item"
            :class="{ active: hoveredPoint === index }"
          >
            <span class="point-number">{{ index + 1 }}</span>
            <span class="point-coords">
              {{ point.lat.toFixed(6) }}, {{ point.lng.toFixed(6) }}
            </span>
            <button @click="removePoint(index)" class="remove-btn">×</button>
          </div>

          <div v-if="pathPoints.length === 0" class="empty-state">点击地图开始绘制轨迹</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import type { Track, TrackPoint, TrackMetadata } from '@/types'

interface PathPoint {
  lat: number
  lng: number
  sortNum: number
}

interface BoundaryData {
  paths: Array<{ lat: number; lng: number }>
  styleId?: string
  rank?: number
  id?: string
}

const props = defineProps<{
  routeName?: string
  loadRouteBoundary?: (routeName: string) => Promise<BoundaryData>
  defaultBoundary?: BoundaryData
}>()

const emit = defineEmits<{
  close: []
  importTrack: [track: Track, suggestions?: Record<string, unknown>]
}>()

// Store
const userStore = useUserStore()

// Refs
const mapCanvas = ref<HTMLCanvasElement>()
const ctx = ref<CanvasRenderingContext2D | null>(null)

// State
const pathPoints = ref<PathPoint[]>([])
const boundaryData = ref<BoundaryData | null>(null)
const sampleTimeInterval = ref(10)
const hoveredPoint = ref<number | null>(null)

// localStorage key for auto-saving path points
const PRTS_PATH_STORAGE_KEY = 'goose_prts_path_points'

// Map bounds (approximate for Southeast University area)
const mapBounds = ref({
  minLat: 31.8,
  maxLat: 32.1,
  minLng: 118.7,
  maxLng: 119.0,
})

// Computed
const sortedPathPoints = computed(() => {
  return [...pathPoints.value].sort((a, b) => a.sortNum - b.sortNum)
})

const totalDistance = computed(() => {
  const points = sortedPathPoints.value
  if (points.length < 2) return 0

  let distance = 0
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    if (prev && curr) {
      distance += calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng)
    }
  }
  return distance
})

const totalTime = computed(() => {
  const segmentCount = Math.max(0, pathPoints.value.length - 1)
  return segmentCount * sampleTimeInterval.value
})

const formattedDistance = computed(() => {
  const distance = totalDistance.value
  if (distance < 1000) return `${distance.toFixed(0)} m`
  return `${(distance / 1000).toFixed(2)} km`
})

const formattedTime = computed(() => {
  const time = totalTime.value
  const minutes = Math.floor(time / 60)
  const seconds = time % 60
  if (minutes > 0) return `${minutes} 分 ${seconds} 秒`
  return `${seconds} 秒`
})

// Methods

function calculateBounds() {
  if (!boundaryData.value?.paths.length) return

  const paths = boundaryData.value.paths
  const lats = paths.map((p) => p.lat)
  const lngs = paths.map((p) => p.lng)

  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  // Calculate range and center
  const latRange = maxLat - minLat
  const lngRange = maxLng - minLng
  const centerLat = (minLat + maxLat) / 2
  const centerLng = (minLng + maxLng) / 2

  // Get canvas aspect ratio
  const canvas = mapCanvas.value
  const canvasWidth = canvas?.offsetWidth || 600
  const canvasHeight = canvas?.offsetHeight || 400
  const canvasAspectRatio = canvasWidth / canvasHeight

  // Calculate lat/lng aspect ratio (approximate, considering latitude scaling)
  const latScale = 1
  const lngScale = Math.cos((centerLat * Math.PI) / 180) // longitude scaling at this latitude
  const dataAspectRatio = (lngRange * lngScale) / (latRange * latScale)

  // Adjust bounds to maintain aspect ratio
  let adjustedLatRange = latRange
  let adjustedLngRange = lngRange

  if (dataAspectRatio > canvasAspectRatio) {
    // Data is wider than canvas, expand lat range
    adjustedLatRange = (lngRange * lngScale) / (canvasAspectRatio * latScale)
  } else {
    // Data is taller than canvas, expand lng range
    adjustedLngRange = (latRange * latScale * canvasAspectRatio) / lngScale
  }

  // Add padding
  const paddingPercent = 0.15 // 15% padding
  adjustedLatRange *= 1 + paddingPercent
  adjustedLngRange *= 1 + paddingPercent

  mapBounds.value = {
    minLat: centerLat - adjustedLatRange / 2,
    maxLat: centerLat + adjustedLatRange / 2,
    minLng: centerLng - adjustedLngRange / 2,
    maxLng: centerLng + adjustedLngRange / 2,
  }

  console.log('PRTS: Updated bounds to fit boundary with correct aspect ratio:', mapBounds.value)
}

function handleCanvasClick(event: MouseEvent) {
  if (!mapCanvas.value) return

  const rect = mapCanvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const lat = yToLat(y)
  const lng = xToLng(x)

  addPathPoint(lat, lng)
}

function handleCanvasMouseMove(event: MouseEvent) {
  if (!mapCanvas.value) return

  const rect = mapCanvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  // Find closest point for hover effect
  let closestIndex = -1
  let minDistance = Infinity

  pathPoints.value.forEach((point, index) => {
    const distance = Math.sqrt(
      Math.pow(latToY(point.lat) - y, 2) + Math.pow(lngToX(point.lng) - x, 2),
    )
    if (distance < 20 && distance < minDistance) {
      minDistance = distance
      closestIndex = index
    }
  })

  hoveredPoint.value = closestIndex >= 0 ? closestIndex : null
  drawMap()
}

function handleCanvasMouseLeave() {
  hoveredPoint.value = null
  drawMap()
}

function addPathPoint(lat: number, lng: number) {
  const newPoint: PathPoint = {
    lat,
    lng,
    sortNum: pathPoints.value.length + 1,
  }
  pathPoints.value.push(newPoint)
  drawMap()
}

function removePoint(index: number) {
  pathPoints.value.splice(index, 1)
  // Update sort numbers
  pathPoints.value.forEach((point, i) => {
    point.sortNum = i + 1
  })
  drawMap()
}

function clearPoints() {
  if (pathPoints.value.length > 0 && confirm('确定要清除所有路径点吗？')) {
    pathPoints.value = []
    drawMap()
  }
}

function exportToGOOSE() {
  if (pathPoints.value.length < 2) {
    alert('至少需要2个路径点才能导出')
    return
  }

  const trackPoints: TrackPoint[] = sortedPathPoints.value.map((point) => ({
    lat: point.lat,
    lng: point.lng,
    sortNum: point.sortNum,
  }))

  const metadata: TrackMetadata = {
    totalDistance: totalDistance.value,
    formattedDistance: formattedDistance.value,
    totalTime: totalTime.value,
    formattedTime: formattedTime.value,
    sampleTimeInterval: sampleTimeInterval.value,
    pointCount: pathPoints.value.length,
    createdAt: new Date().toISOString(),
  }

  const track: Track = {
    track: trackPoints,
    metadata,
  }

  // Auto-save to localStorage when completing
  saveToLocalStorage()

  // Provide smart suggestions for workout parameters
  const suggestions = {
    suggestedTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
    suggestedDuration: Math.ceil(totalTime.value / 60) + 5, // Add 5 minutes buffer
    suggestedDistance: Math.round((totalDistance.value / 1000) * 100) / 100, // Round to 2 decimal places
    optimalSampleInterval: sampleTimeInterval.value,
  }

  emit('importTrack', track, suggestions)
}

// Auto-save to localStorage
function saveToLocalStorage() {
  try {
    const saveData = {
      pathPoints: pathPoints.value,
      sampleTimeInterval: sampleTimeInterval.value,
      savedAt: new Date().toISOString(),
      routeName: props.routeName,
    }
    localStorage.setItem(PRTS_PATH_STORAGE_KEY, JSON.stringify(saveData))
    console.log('PRTS: Path points auto-saved to localStorage')
  } catch (error) {
    console.warn('PRTS: Failed to save to localStorage:', error)
  }
}

// Load existing custom track from userStore for editing
function loadExistingCustomTrack() {
  try {
    if (userStore.customTrackData && userStore.customTrackData.track.length > 0) {
      // Convert Track format to PathPoint format for editing
      pathPoints.value = userStore.customTrackData.track.map((trackPoint) => ({
        lat: trackPoint.lat,
        lng: trackPoint.lng,
        sortNum: trackPoint.sortNum,
      }))

      // Load sample time interval if available
      if (userStore.customTrackData.metadata.sampleTimeInterval) {
        sampleTimeInterval.value = userStore.customTrackData.metadata.sampleTimeInterval
      }

      drawMap()
      console.log(
        'PRTS: Loaded existing custom track for editing:',
        pathPoints.value.length,
        'points',
      )
      return true
    }
  } catch (error) {
    console.warn('PRTS: Failed to load existing custom track:', error)
  }
  return false
}

// Load from localStorage
function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem(PRTS_PATH_STORAGE_KEY)
    if (saved) {
      const saveData = JSON.parse(saved)
      if (saveData.pathPoints && Array.isArray(saveData.pathPoints)) {
        pathPoints.value = saveData.pathPoints
        if (saveData.sampleTimeInterval) {
          sampleTimeInterval.value = saveData.sampleTimeInterval
        }
        drawMap()
        console.log(
          'PRTS: Path points loaded from localStorage:',
          saveData.pathPoints.length,
          'points',
        )
        return true
      }
    }
  } catch (error) {
    console.warn('PRTS: Failed to load from localStorage:', error)
  }
  return false
}

// Export as JSON file
function exportAsJSON() {
  if (pathPoints.value.length === 0) {
    alert('没有路径点可导出')
    return
  }

  try {
    const trackPoints: TrackPoint[] = sortedPathPoints.value.map((point) => ({
      lat: point.lat,
      lng: point.lng,
      sortNum: point.sortNum,
    }))

    const metadata: TrackMetadata = {
      totalDistance: totalDistance.value,
      formattedDistance: formattedDistance.value,
      totalTime: totalTime.value,
      formattedTime: formattedTime.value,
      sampleTimeInterval: sampleTimeInterval.value,
      pointCount: pathPoints.value.length,
      createdAt: new Date().toISOString(),
    }

    const track: Track = {
      track: trackPoints,
      metadata,
    }

    const trackData = JSON.stringify(track, null, 2)
    const blob = new Blob([trackData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `prts-track-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    alert('✅ 轨迹已导出为 JSON 文件')
  } catch (error) {
    console.error('Export error:', error)
    alert('❌ 导出失败')
  }
}

// Coordinate conversion functions
function latToY(lat: number): number {
  const bounds = mapBounds.value
  const height = mapCanvas.value?.offsetHeight || 400
  return height - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * height
}

function lngToX(lng: number): number {
  const bounds = mapBounds.value
  const width = mapCanvas.value?.offsetWidth || 600
  return ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width
}

function yToLat(y: number): number {
  const bounds = mapBounds.value
  const height = mapCanvas.value?.offsetHeight || 400
  const ratio = 1 - y / height
  return bounds.minLat + ratio * (bounds.maxLat - bounds.minLat)
}

function xToLng(x: number): number {
  const bounds = mapBounds.value
  const width = mapCanvas.value?.offsetWidth || 600
  const ratio = x / width
  return bounds.minLng + ratio * (bounds.maxLng - bounds.minLng)
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Simplified distance calculation (Haversine formula)
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

function drawMap() {
  if (!ctx.value || !mapCanvas.value) return

  const width = mapCanvas.value.offsetWidth
  const height = mapCanvas.value.offsetHeight

  // Clear canvas
  ctx.value.clearRect(0, 0, width, height)

  // Draw boundary if available
  if (boundaryData.value?.paths.length) {
    ctx.value.strokeStyle = '#007bff'
    ctx.value.lineWidth = 2
    ctx.value.beginPath()

    boundaryData.value.paths.forEach((point, index) => {
      const x = lngToX(point.lng)
      const y = latToY(point.lat)
      if (index === 0) {
        ctx.value?.moveTo(x, y)
      } else {
        ctx.value?.lineTo(x, y)
      }
    })

    ctx.value.closePath()
    ctx.value.stroke()
  }

  // Draw path
  if (pathPoints.value.length > 1) {
    ctx.value.strokeStyle = '#28a745'
    ctx.value.lineWidth = 3
    ctx.value.beginPath()

    sortedPathPoints.value.forEach((point, index) => {
      const x = lngToX(point.lng)
      const y = latToY(point.lat)
      if (index === 0) {
        ctx.value?.moveTo(x, y)
      } else {
        ctx.value?.lineTo(x, y)
      }
    })

    ctx.value.stroke()
  }

  // Draw points
  pathPoints.value.forEach((point, index) => {
    const x = lngToX(point.lng)
    const y = latToY(point.lat)

    ctx.value!.fillStyle = hoveredPoint.value === index ? '#ff6b6b' : '#dc3545'
    ctx.value!.beginPath()
    ctx.value!.arc(x, y, 6, 0, 2 * Math.PI)
    ctx.value!.fill()

    // Draw point number
    ctx.value!.fillStyle = 'white'
    ctx.value!.font = '12px Arial'
    ctx.value!.textAlign = 'center'
    ctx.value!.fillText(String(index + 1), x, y + 4)
  })
}

// Lifecycle
onMounted(async () => {
  await nextTick()

  console.log('PRTS: Component mounted, route:', props.routeName)
  console.log('PRTS: Boundary loader available:', !!props.loadRouteBoundary)

  // Try to load route-specific boundary first
  if (props.loadRouteBoundary && props.routeName && props.routeName !== '自定义轨迹') {
    try {
      console.log('PRTS: Loading initial boundary for route:', props.routeName)
      const routeBoundary = await props.loadRouteBoundary(props.routeName)
      console.log('PRTS: Initial boundary loaded:', routeBoundary)

      if (routeBoundary) {
        boundaryData.value = routeBoundary
        calculateBounds()
        await nextTick()
        drawMap()
      }
    } catch (loadError) {
      console.error('PRTS: Failed to load initial route boundary:', loadError)
      // Fall back to default boundary
      if (props.defaultBoundary) {
        boundaryData.value = props.defaultBoundary
        calculateBounds()
        await nextTick()
        drawMap()
      }
    }
  } else if (props.defaultBoundary) {
    // Use default boundary if provided
    console.log('PRTS: Using default boundary')
    boundaryData.value = props.defaultBoundary
    calculateBounds()
  } else {
    console.log('PRTS: No boundary available')
  }

  if (mapCanvas.value) {
    ctx.value = mapCanvas.value.getContext('2d')
    // Set responsive canvas size
    resizeCanvas()

    // Try to load existing custom track for editing
    let loaded = loadExistingCustomTrack()
    if (!loaded) {
      // Fallback to loading from localStorage if no custom track exists
      loaded = loadFromLocalStorage()
      if (loaded) {
        console.log('PRTS: Previous path points restored from localStorage')
      }
    }

    drawMap()

    // Handle window resize
    window.addEventListener('resize', resizeCanvas)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
})

// Watch for route changes and update boundary accordingly
watch(
  () => props.routeName,
  async (newRouteName) => {
    console.log('PRTS: Route changed to:', newRouteName)
    console.log('PRTS: Boundary loader available:', !!props.loadRouteBoundary)
    console.log('PRTS: Current boundary data:', boundaryData.value)

    if (newRouteName && props.loadRouteBoundary && newRouteName !== '自定义轨迹') {
      try {
        console.log('PRTS: Loading boundary for route:', newRouteName)
        const routeBoundary = await props.loadRouteBoundary(newRouteName)
        console.log('PRTS: Loaded boundary:', routeBoundary)

        if (routeBoundary) {
          boundaryData.value = routeBoundary
          calculateBounds()
          drawMap()
          console.log('PRTS: Updated map with new boundary for route:', newRouteName)
        } else {
          console.warn('PRTS: No boundary data returned for route:', newRouteName)
        }
      } catch (error) {
        console.error('PRTS: Failed to update boundary for route:', newRouteName, error)
        // Fallback to default boundary
        if (props.defaultBoundary) {
          boundaryData.value = props.defaultBoundary
          calculateBounds()
          drawMap()
          console.log('PRTS: Fallen back to default boundary')
        }
      }
    } else {
      console.log('PRTS: Skipping boundary update - route is custom or no boundary loader')
    }
  },
  { immediate: true },
)

function resizeCanvas() {
  if (!mapCanvas.value) return

  const container = mapCanvas.value.parentElement
  if (container) {
    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    // Set the actual canvas size (accounting for device pixel ratio)
    const canvasWidth = rect.width - 4
    const canvasHeight = rect.height - 4

    mapCanvas.value.width = canvasWidth * dpr
    mapCanvas.value.height = canvasHeight * dpr

    // Set the display size via CSS
    mapCanvas.value.style.width = canvasWidth + 'px'
    mapCanvas.value.style.height = canvasHeight + 'px'

    // Scale the drawing context to account for device pixel ratio
    if (ctx.value) {
      ctx.value.scale(dpr, dpr)
    }

    // Recalculate bounds with new canvas dimensions
    if (boundaryData.value?.paths.length) {
      calculateBounds()
    }
    drawMap()
  }
}
</script>

<style scoped>
.prts-tracker-content {
  background: transparent;
  border: none;
  overflow: hidden;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
}

.prts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px 12px;
  background: var(--color-surface-raised);
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border-subtle);
}

.prts-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
}

.close-btn {
  background: var(--color-surface-interactive);
  border: 1px solid var(--color-border-subtle);
  color: var(--color-text);
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  font-weight: bold;
  text-transform: uppercase;
  transition: all 0.2s;
  letter-spacing: 1px;
  min-width: 28px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-background);
}

.prts-toolbar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 15px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border-subtle);
  flex-wrap: wrap;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-section label {
  font-weight: bold;
  font-size: 11px;
  color: var(--color-text);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
}

.time-input {
  width: 60px;
  padding: 6px 8px;
  border: 1px solid var(--color-border-subtle);
  background: var(--color-surface-interactive);
  color: var(--color-text);
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  font-size: 11px;
  font-weight: bold;
  outline: none;
  transition: all 0.2s;
  -webkit-appearance: none;
  -moz-appearance: textfield;
  appearance: none;
}

/* Custom spinner buttons for webkit browsers */
.time-input::-webkit-outer-spin-button,
.time-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.time-input:focus {
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.time-input:hover {
  border-color: var(--color-primary);
}

.stat {
  background: var(--color-surface);
  padding: 6px 12px;
  border: 1px solid var(--color-border-subtle);
  font-size: 11px;
  font-weight: bold;
  color: var(--color-text);
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  text-transform: uppercase;
  height: 28px;
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
}

.actions {
  gap: 10px;
  margin-left: auto;
}

.btn {
  padding: 8px 16px;
  border: 1px solid var(--color-border-subtle);
  background: var(--color-surface-interactive);
  cursor: pointer;
  font-size: 11px;
  font-weight: bold;
  transition: all 0.2s;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.btn-compact {
  padding: 6px 12px;
  font-size: 11px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-warning {
  background: var(--color-warning);
  border-color: var(--color-warning);
  color: var(--color-background);
}

.btn-warning:hover {
  background: var(--color-background);
  color: var(--color-warning);
}

.btn-success {
  background: var(--color-success);
  border-color: var(--color-success);
  color: var(--color-background);
}

.btn-success:hover {
  background: var(--color-background);
  color: var(--color-success);
}

.btn-info {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-background);
}

.btn-info:hover {
  background: var(--color-background);
  color: var(--color-primary);
}

.prts-main {
  display: flex;
  gap: 20px;
  padding: 15px;
  min-height: 400px;
  background: var(--color-surface);
  overflow: hidden;
}

.map-container {
  flex: 1;
  background: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  position: relative;
  overflow: hidden;
  height: 400px;
}

.map-canvas {
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.points-panel {
  width: 280px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  display: flex;
  flex-direction: column;
  height: 400px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid var(--color-border-subtle);
  background: var(--color-surface-raised);
}

.panel-header {
  flex-direction: column;
  align-items: flex-start;
}

.panel-header h4 {
  margin: 0;
  color: var(--color-text);
  font-size: 16px;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.edit-hint {
  margin-top: 4px;
  font-size: 10px;
  color: var(--color-success);
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: bold;
}

.points-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.point-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  margin-bottom: 4px;
  background: var(--color-surface-interactive);
  border: 1px solid var(--color-border-subtle);
  transition: all 0.3s;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
}

.point-item.active {
  background: var(--color-primary-bg);
  border-color: var(--color-primary);
}

.point-number {
  background: var(--color-primary);
  color: var(--color-background);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
}

.point-coords {
  flex: 1;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  font-size: 12px;
  color: var(--color-text);
}

.remove-btn {
  background: var(--color-text-muted);
  color: var(--color-background);
  border: none;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  transition: background-color 0.3s;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  font-weight: bold;
}

.remove-btn:hover {
  background: var(--color-text);
}

.empty-state {
  text-align: center;
  color: var(--color-text-muted);
  padding: 40px 20px;
  font-family:
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'SF Mono', Monaco, 'Cascadia Code',
    'Roboto Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif;
  font-size: 13px;
}

@media (max-width: 768px) {
  .prts-main {
    flex-direction: column;
  }

  .points-panel {
    width: 100%;
    max-height: 250px;
  }

  .prts-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .stats {
    margin-left: 0;
  }
}
</style>
