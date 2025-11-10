import type { TrackPoint } from '@/types'
import { EARTH_RADIUS_KM } from '@/types/constants'

export function calculateDistance(point1: TrackPoint, point2: TrackPoint): number {
  const radLat1 = (point1.lat * Math.PI) / 180
  const radLat2 = (point2.lat * Math.PI) / 180
  const l1 = radLat1 - radLat2
  const l2 = ((point1.lng - point2.lng) * Math.PI) / 180

  const haversine =
    Math.pow(Math.sin(l1 / 2), 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(l2 / 2), 2)

  const angularDistance = 2 * Math.asin(Math.sqrt(haversine))
  return angularDistance * EARTH_RADIUS_KM
}

export function calculateTrackDistance(track: TrackPoint[]): number {
  let distance = 0
  for (let i = 0; i < track.length - 1; i++) {
    const point1 = track[i]
    const point2 = track[i + 1]
    if (point1 && point2) {
      distance += calculateDistance(point1, point2)
    }
  }
  return distance
}
