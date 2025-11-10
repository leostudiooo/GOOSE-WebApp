import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Headers } from '@/types'

export const useConfigStore = defineStore('config', () => {
  const headers = ref<Headers | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadHeaders() {
    if (headers.value) return

    loading.value = true
    error.value = null

    try {
      const response = await fetch('/config/headers.json')
      if (!response.ok) {
        throw new Error('Failed to load headers config')
      }
      headers.value = await response.json()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    headers,
    loading,
    error,
    loadHeaders,
  }
})
