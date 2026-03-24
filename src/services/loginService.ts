import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { listen } from '@tauri-apps/api/event'

const CAS_LOGIN_URL =
  'https://auth.seu.edu.cn/dist/#/dist/main/login?service=https%3A%2F%2Ftyxsjpt.seu.edu.cn%2Fapi%2Foauth%2Fanno%2FtokenH5-cas'

interface LoginResult {
  success: boolean
  token?: string
  error?: string
}

let loginWindow: WebviewWindow | null = null

export function isTauriEnvironment(): boolean {
  return '__TAURI__' in window
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

    const cleanup = () => {
      if (loginWindow) {
        loginWindow.close()
        loginWindow = null
      }
    }

    const handleResult = (result: LoginResult) => {
      if (resolved) return
      resolved = true
      cleanup()
      resolve(result)
    }

    try {
      // Create login window
      loginWindow = new WebviewWindow('cas-login', {
        url: CAS_LOGIN_URL,
        title: 'CAS 登录',
        width: 500,
        height: 700,
        resizable: true,
        center: true,
      })

      // Listen for window created event
      loginWindow.once('tauri://created', () => {
        console.log('[LoginService] Login window created')
      })

      // Listen for window close event
      loginWindow.once('tauri://close-requested', () => {
        console.log('[LoginService] Login window closed by user')
        handleResult({
          success: false,
          error: '用户取消登录',
        })
      })

      // Listen for token captured event from Rust backend
      listen('token-captured', (event) => {
        console.log('[LoginService] Token received via event')
        const payload = event.payload as { token: string }
        if (payload?.token) {
          handleResult({
            success: true,
            token: payload.token,
          })
        }
      }).catch((err: unknown) => {
        console.error('[LoginService] Failed to listen for token event:', err)
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
      console.error('[LoginService] Failed to create login window:', error)
      handleResult({
        success: false,
        error: error instanceof Error ? error.message : '创建登录窗口失败',
      })
    }
  })
}

export function closeLoginWindow(): void {
  if (loginWindow) {
    loginWindow.close()
    loginWindow = null
  }
}
