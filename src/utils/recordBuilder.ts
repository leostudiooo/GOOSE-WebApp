import type { Route, StartRecord, FinishRecord, TrackPoint } from '@/types'

export function buildStartRecord(
  route: Route,
  dateTime: string,
  startImageUrl: string,
  finishImageUrl: string,
  track: TrackPoint[],
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
    endImage: finishImageUrl,
    strLatitudeLongitude: track,
    routeRule: route.routeRule,
    maxTime: route.maxTime,
    minTime: route.minTime,
    orouteKilometre: route.routeDistanceKm,
    ruleEndTime: route.ruleEndTime,
    ruleStartTime: route.ruleStartTime,
    calorie: 0,
    speed: "0'00''",
    dispTimeText: 0,
    studentId: studentId,
  }
}

export function buildFinishRecord(
  startRecord: StartRecord,
  recordId: string,
  status: number,
): FinishRecord {
  return {
    ...startRecord,
    id: recordId,
    nowStatus: status,
  }
}
