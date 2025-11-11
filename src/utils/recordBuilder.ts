import type { Route, StartRecord, FinishRecord, TrackPoint, Track } from '@/types'

const CALORIE_PER_KM = 65 // 每公里消耗卡路里，与 Python 版本保持一致

export function buildStartRecord(
  route: Route,
  dateTime: string,
  startImageUrl: string,
  studentId: string,
): StartRecord {
  const date = new Date(dateTime)
  const recordTime = date.toISOString().split('T')[0] || ''
  const startTime = date.toTimeString().split(' ')[0] || ''

  return {
    routeName: route.routeName,
    ruleId: route.ruleId,
    planId: route.planId,
    recordTime,
    startTime,
    startImage: startImageUrl,
    endTime: '',
    exerciseTimes: '',
    routeKilometre: '',
    endImage: '',
    strLatitudeLongitude: "[]", // start record 的轨迹数据为空的 JSON 字符串
    routeRule: route.routeRule,
    maxTime: route.maxTime,
    minTime: route.minTime,
    orouteKilometre: route.routeDistanceKm,
    ruleEndTime: route.ruleEndTime,
    ruleStartTime: route.ruleStartTime,
    calorie: "0",
    speed: "0'00''",
    dispTimeText: "00:00:00",
    studentId: studentId,
  }
}

// 计算两个轨迹点之间的距离（Haversine 公式）
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const EARTH_RADIUS_KM = 6371
  const radLat1 = Math.PI * lat1 / 180
  const radLat2 = Math.PI * lat2 / 180
  const deltaLat = radLat2 - radLat1
  const deltaLng = Math.PI * (lng2 - lng1) / 180

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(radLat1) * Math.cos(radLat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_KM * c
}

// 计算轨迹总距离
function calculateTrackDistance(track: TrackPoint[]): number {
  let totalDistance = 0
  for (let i = 0; i < track.length - 1; i++) {
    const p1 = track[i]
    const p2 = track[i + 1]
    totalDistance += calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng)
  }
  return totalDistance
}

export function buildFinishRecord(
  startRecord: StartRecord,
  finishImageUrl: string,
  track: Track,
  recordId: string,
  status: number,
): FinishRecord {
  // 计算距离和时间
  const distanceKm = calculateTrackDistance(track.track)
  const durationSec = track.metadata.totalTime
  const paceSec = distanceKm === 0 ? 0 : Math.round(durationSec / distanceKm)

  // 计算结束时间
  const startDateTime = new Date(`${startRecord.recordTime}T${startRecord.startTime}`)
  const endDateTime = new Date(startDateTime.getTime() + durationSec * 1000)
  const endTime = endDateTime.toTimeString().split(' ')[0]

  // 格式化时间显示
  const hours = Math.floor(durationSec / 3600)
  const minutes = Math.floor((durationSec % 3600) / 60)
  const seconds = durationSec % 60
  const dispTimeText = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  // 格式化配速
  const speed = paceSec === 0 ? "0'00''" : `${Math.floor(paceSec / 60)}'${(paceSec % 60).toString().padStart(2, '0')}''`

  return {
    ...startRecord,
    endTime,
    exerciseTimes: durationSec, // 应该是数字而不是字符串
    routeKilometre: distanceKm.toFixed(2),
    endImage: finishImageUrl,
    strLatitudeLongitude: JSON.stringify(track.track), // 应该是 JSON 字符串
    calorie: Math.round(CALORIE_PER_KM * distanceKm).toString(),
    speed,
    dispTimeText,
    id: recordId,
    nowStatus: status.toString(), // 应该是字符串
  }
}
