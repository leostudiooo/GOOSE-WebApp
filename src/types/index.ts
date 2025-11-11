export interface Headers {
  userAgent: string
  miniappVersion: string
  referer: string
  tenant: string
}

export interface Route {
  routeName: string
  ruleId: string
  planId: string
  routeRule: string
  maxTime: number
  minTime: number
  routeDistanceKm: number
  ruleEndTime: string
  ruleStartTime: string
}

export interface RouteGroup {
  routes: Route[]
}

export interface TrackPoint {
  lat: number
  lng: number
  sortNum: number
}

export interface TrackMetadata {
  totalDistance: number
  formattedDistance: string
  totalTime: number
  formattedTime: string
  sampleTimeInterval: number
  pointCount: number
  createdAt: string
}

export interface BoundaryData {
  paths: Array<{ lat: number; lng: number }>
  styleId?: string
  rank?: number
  id?: string
}

export interface Track {
  track: TrackPoint[]
  metadata: TrackMetadata
}

export interface CustomTrack {
  enable: boolean
  filePath: string
}

export interface User {
  token: string
  dateTime: string
  startImage: string
  finishImage: string
  route: string
  customTrack: CustomTrack
}

export interface StartRecord {
  routeName: string
  ruleId: string
  planId: string
  recordTime: string
  startTime: string
  startImage: string
  endTime: string
  exerciseTimes: string | number
  routeKilometre: string
  endImage: string
  strLatitudeLongitude: string
  routeRule: string
  maxTime: number
  minTime: number
  orouteKilometre: number
  ruleEndTime: string
  ruleStartTime: string
  calorie: string
  speed: string
  dispTimeText: string
  studentId: string
}

export interface FinishRecord extends StartRecord {
  id: string
  nowStatus: string
}
