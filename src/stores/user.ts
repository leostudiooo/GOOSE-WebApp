import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { User, Track } from '@/types'

const STORAGE_KEY = 'goose_user_config'

function getDefaultUser(): User {
  return {
    token: '',
    dateTime: new Date().toISOString(),
    startImage: '',
    finishImage: '',
    route: '梅园田径场',
    customTrack: {
      enable: true,
      filePath: '',
    },
  }
}

function loadFromStorage(): User {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load user config from localStorage:', e)
  }
  return getDefaultUser()
}

function saveToStorage(user: User) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } catch (e) {
    console.error('Failed to save user config to localStorage:', e)
  }
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User>(loadFromStorage())
  const startImageFile = ref<File | null>(null)
  const finishImageFile = ref<File | null>(null)
  const customTrackData = ref<Track | null>(null)

  watch(
    user,
    (newUser) => {
      saveToStorage(newUser)
    },
    { deep: true },
  )

  function updateToken(token: string) {
    user.value.token = token
  }

  function updateDateTime(dateTime: string) {
    user.value.dateTime = dateTime
  }

  function updateRoute(route: string) {
    user.value.route = route
  }

  function updateStartImage(file: File) {
    startImageFile.value = file
    user.value.startImage = file.name
  }

  function updateFinishImage(file: File) {
    finishImageFile.value = file
    user.value.finishImage = file.name
  }

  function enableCustomTrack(track: Track) {
    customTrackData.value = track
    user.value.customTrack.enable = true
    user.value.customTrack.filePath = 'custom'
    
    // Don't automatically change the route - let user keep their selected venue
  }

  function disableCustomTrack() {
    customTrackData.value = null
    user.value.customTrack.enable = false
    user.value.customTrack.filePath = ''
  }

  function reset() {
    user.value = getDefaultUser()
    startImageFile.value = null
    finishImageFile.value = null
    customTrackData.value = null
  }

  return {
    user,
    startImageFile,
    finishImageFile,
    customTrackData,
    updateToken,
    updateDateTime,
    updateRoute,
    updateStartImage,
    updateFinishImage,
    enableCustomTrack,
    disableCustomTrack,
    reset,
  }
})
