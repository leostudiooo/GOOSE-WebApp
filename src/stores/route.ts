import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Route, Track } from '@/types'

export const useRouteStore = defineStore('route', () => {
  const routes = ref<Route[]>([])
  const tracks = ref<Map<string, Track>>(new Map())
  const loading = ref(false)
  const error = ref<string | null>(null)

  const routeNames = computed(() => routes.value.map((r) => r.routeName))

  async function loadRoutes() {
    if (routes.value.length > 0) return

    loading.value = true
    error.value = null

    try {
      const response = await fetch('/config/routes.json')
      if (!response.ok) {
        throw new Error('Failed to load routes config')
      }
      const data = await response.json()
      routes.value = data.routes
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function loadTrack(routeName: string): Promise<Track> {
    if (tracks.value.has(routeName)) {
      return tracks.value.get(routeName)!
    }

    try {
      const response = await fetch(`/tracks/${routeName}.json`)
      if (!response.ok) {
        throw new Error(`Failed to load track for ${routeName}`)
      }
      const track: Track = await response.json()
      tracks.value.set(routeName, track)
      return track
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    }
  }

  function getRoute(routeName: string): Route | undefined {
    return routes.value.find((r) => r.routeName === routeName)
  }

  return {
    routes,
    tracks,
    loading,
    error,
    routeNames,
    loadRoutes,
    loadTrack,
    getRoute,
  }
})
