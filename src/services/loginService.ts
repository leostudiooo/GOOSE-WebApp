import type { LoginResult } from '@/types'
import { isTauriEnvironment } from '@/utils/tauriEnv'

export { isTauriEnvironment }

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

    Promise.all([
      import('@tauri-apps/api/event').then((m) => m.listen),
      import('@tauri-apps/api/core').then((m) => m.invoke),
    ])
      .then(([listen, invoke]) => {
        // Listen for token captured event from Rust backend
        return listen<string>('token-captured', (event) => {
          console.log('[LoginService] Token received')
          handleResult({
            success: true,
            token: event.payload,
          })
        }).then((unlistenFn) => {
          unlisten = unlistenFn
          // After listener is ready, open the login window via Rust command
          return invoke('open_login_window')
        })
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
  })
}

export function closeLoginWindow(): void {
  // Note: closing is handled by Rust when token is captured
}
