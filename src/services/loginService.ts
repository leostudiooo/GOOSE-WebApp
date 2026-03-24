import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'

interface LoginResult {
  success: boolean
  token?: string
  error?: string
}

export function isTauriEnvironment(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof (window as any).__TAURI_INTERNALS__ !== 'undefined'
}

export async function openLoginWindow(): Promise<LoginResult> {
  if (!isTauriEnvironment()) {
    return {
      success: false,
      error: '此功能仅在桌面版中可用',
    }
  }

  return new Promise((resolve) => {
    let resolved = false

    const handleResult = (result: LoginResult) => {
      if (resolved) return
      resolved = true
      // Clean up event listener
      if (unlisten) unlisten()
      resolve(result)
    }

    let unlisten: (() => void) | undefined

    try {
      // Listen for token captured event from Rust backend
      listen<string>('token-captured', (event) => {
        console.log(
          '[LoginService] Token received via event:',
          event.payload.substring(0, 20) + '...',
        )
        handleResult({
          success: true,
          token: event.payload,
        })
      })
        .then((unlistenFn) => {
          unlisten = unlistenFn
          // After listener is ready, open the login window via Rust command
          return invoke('open_login_window')
        })
        .then(() => {
          console.log('[LoginService] Login window opened')
        })
        .catch((err: unknown) => {
          console.error('[LoginService] Failed:', err)
          handleResult({
            success: false,
            error: err instanceof Error ? err.message : '打开登录窗口失败',
          })
        })

      // Set timeout for login
      setTimeout(() => {
        if (!resolved) {
          console.log('[LoginService] Login timeout')
          handleResult({
            success: false,
            error: '登录超时，请重试',
          })
        }
      }, 300000) // 5 minutes timeout
    } catch (error) {
      console.error('[LoginService] Failed:', error)
      handleResult({
        success: false,
        error: error instanceof Error ? error.message : '创建登录窗口失败',
      })
    }
  })
}

export function closeLoginWindow(): void {
  // Note: closing is handled by Rust when token is captured
}
