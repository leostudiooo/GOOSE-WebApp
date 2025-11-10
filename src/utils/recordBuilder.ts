import type { Route, Track, StartRecord, FinishRecord } from '@/types'
import { CALORIE_PER_KM, RECORD_STATUS_FINISHED } from '@/types/constants'
import { getStudentId } from './tokenDecoder'

export function buildStartRecord(
  route: Route,
  dateTime: Date,
  startImageUrl: string,
  token: string,
): StartRecord {
  const recordTime = dateTime.toISOString().split('T')[0] || ''
  const startTime = dateTime.toTimeString().split(' ')[0] || ''

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
    strLatitudeLongitude: [],
    routeRule: route.routeRule,
    maxTime: route.maxTime,
    minTime: route.minTime,
    orouteKilometre: route.routeDistanceKm,
    ruleEndTime: route.ruleEndTime,
    ruleStartTime: route.ruleStartTime,
    calorie: 0,
    speed: "0'00''",
    dispTimeText: 0,
    studentId: getStudentId(token),
  }
}

export function buildFinishRecord(
  startRecord: StartRecord,
  track: Track,
  dateTime: Date,
  finishImageUrl: string,
  recordId: string,
): FinishRecord {
  const durationSec = track.metadata.totalTime
  const distanceKm = track.metadata.totalDistance / 1000
  const paceSec = distanceKm === 0 ? 0 : Math.round(durationSec / distanceKm)

  const endTime = new Date(dateTime.getTime() + durationSec * 1000)
  const endTimeStr = endTime.toTimeString().split(' ')[0] || ''

  const hours = Math.floor(durationSec / 3600)
  const minutes = Math.floor((durationSec % 3600) / 60)
  const seconds = durationSec % 60
  const dispTimeText = hours + minutes + seconds

  const speed =
    paceSec === 0 ? "0'00''" : `${Math.floor(paceSec / 60)}'${paceSec % 60}''`

  return {
    ...startRecord,
    endTime: endTimeStr,
    exerciseTimes: durationSec.toString(),
    routeKilometre: distanceKm.toFixed(2),
    endImage: finishImageUrl,
    strLatitudeLongitude: track.track,
    calorie: Math.round(CALORIE_PER_KM * distanceKm),
    speed,
    dispTimeText,
    id: recordId,
    nowStatus: RECORD_STATUS_FINISHED,
  }
}
