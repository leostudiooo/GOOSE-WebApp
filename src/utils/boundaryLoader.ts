import type { BoundaryData } from '@/types'

/**
 * Load boundary data for a specific route
 * @param routeName - The name of the route (required)
 * @returns Promise<BoundaryData> - The boundary data or default boundary
 */
export async function loadRouteBoundary(routeName: string): Promise<BoundaryData> {
  try {
    console.log(`[BoundaryLoader] Loading boundary for route: ${routeName}`)

    const url = `/boundaries/${routeName}.json`
    console.log(`[BoundaryLoader] Fetching from URL: ${url}`)

    const response = await fetch(url)

    console.log(`[BoundaryLoader] Response status: ${response.status}, ok: ${response.ok}`)

    if (!response.ok) {
      throw new Error(
        `Boundary file not found for route: ${routeName} (status: ${response.status})`,
      )
    }

    const data = await response.json()
    console.log(`[BoundaryLoader] Successfully loaded boundary for ${routeName}:`, data)

    return data as BoundaryData
  } catch (error) {
    console.error(`[BoundaryLoader] Failed to load boundary for route ${routeName}:`, error)

    // Return default boundary for Southeast University area
    return getDefaultBoundary()
  }
}

/**
 * Get default boundary data for Southeast University area
 * @returns BoundaryData - Default boundary data
 */
export function getDefaultBoundary(): BoundaryData {
  return {
    paths: [
      { lat: 32.05, lng: 118.85 },
      { lat: 32.06, lng: 118.87 },
      { lat: 32.04, lng: 118.88 },
      { lat: 32.03, lng: 118.86 },
    ],
    styleId: 'default',
    id: 'seu-default-area',
  }
}

/**
 * Get all available boundary files for preloading or validation
 * @returns Promise<string[]> - Array of available boundary file names
 */
export async function getAvailableBoundaries(): Promise<string[]> {
  try {
    // This would ideally come from an API endpoint, but for now we'll use a hardcoded list
    // based on the actual files in the public/boundaries directory
    return [
      '丁家桥体育场',
      '四牌楼体育场',
      '小营田径场',
      '无锡国际校区体育馆',
      '桃园田径场',
      '梅园田径场',
      '橘园田径场',
    ]
  } catch (error) {
    console.warn('Failed to get available boundaries:', error)
    return []
  }
}

/**
 * Preload boundary data for multiple routes
 * @param routeNames - Array of route names
 * @returns Promise<Map<string, BoundaryData>> - Map of route names to boundary data
 */
export async function preloadBoundaries(routeNames: string[]): Promise<Map<string, BoundaryData>> {
  const boundaryMap = new Map<string, BoundaryData>()

  const loadPromises = routeNames.map(async (routeName) => {
    try {
      const boundary = await loadRouteBoundary(routeName)
      boundaryMap.set(routeName, boundary)
    } catch (error) {
      console.warn(`Failed to preload boundary for ${routeName}:`, error)
      // Use default boundary as fallback
      boundaryMap.set(routeName, getDefaultBoundary())
    }
  })

  await Promise.all(loadPromises)
  return boundaryMap
}
