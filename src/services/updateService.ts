import { isTauriEnvironment } from '@/utils/tauriEnv'

interface GithubRelease {
  tag_name: string
  html_url: string
  prerelease: boolean
  draft: boolean
}

export interface UpdateCheckResult {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl: string
}

const RELEASE_API_URL = 'https://api.github.com/repos/leostudiooo/GOOSE-WebApp/releases/latest'
const RELEASE_PAGE_URL = 'https://github.com/leostudiooo/GOOSE-WebApp/releases/latest'

function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/i, '')
}

function compareVersion(a: string, b: string): number {
  const aParts = normalizeVersion(a)
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0)
  const bParts = normalizeVersion(b)
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0)

  const len = Math.max(aParts.length, bParts.length)
  for (let i = 0; i < len; i++) {
    const av = aParts[i] || 0
    const bv = bParts[i] || 0
    if (av > bv) return 1
    if (av < bv) return -1
  }
  return 0
}

async function getCurrentVersion(): Promise<string> {
  if (!isTauriEnvironment()) {
    return '0.0.0'
  }

  const { getVersion } = await import('@tauri-apps/api/app')
  return getVersion()
}

async function getLatestRelease(): Promise<GithubRelease> {
  const response = await fetch(RELEASE_API_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  })

  if (!response.ok) {
    throw new Error(`检查更新失败 (${response.status})`)
  }

  const release = (await response.json()) as GithubRelease
  if (!release || release.draft || release.prerelease || !release.tag_name) {
    throw new Error('未找到可用正式版本')
  }

  return release
}

export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  const [currentVersion, latestRelease] = await Promise.all([
    getCurrentVersion(),
    getLatestRelease(),
  ])

  const latestVersion = normalizeVersion(latestRelease.tag_name)
  const hasUpdate = compareVersion(latestVersion, currentVersion) > 0

  return {
    hasUpdate,
    currentVersion,
    latestVersion,
    releaseUrl: latestRelease.html_url || RELEASE_PAGE_URL,
  }
}

export function openReleasePage(url = RELEASE_PAGE_URL): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}
