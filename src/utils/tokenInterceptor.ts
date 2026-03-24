const TOKEN_PATTERN = /Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/
const TOKEN_ENDPOINT = 'tokenH5-cas'

function extractTokenFromUrl(url: string): string | null {
  if (!url.includes(TOKEN_ENDPOINT)) return null

  try {
    const urlObj = new URL(url, window.location.origin)
    const tokenParam = urlObj.searchParams.get('token')

    if (tokenParam && TOKEN_PATTERN.test(`Bearer ${tokenParam}`)) {
      return tokenParam
    }
  } catch {
    // Invalid URL
  }

  return null
}

function extractTokenFromHeaders(headers: Headers | Record<string, string>): string | null {
  const tokenHeader =
    headers instanceof Headers ? headers.get('token') : headers['token'] || headers['Token']

  if (tokenHeader && TOKEN_PATTERN.test(tokenHeader)) {
    return tokenHeader.replace('Bearer ', '')
  }

  return null
}

async function handleTokenFound(token: string): Promise<void> {
  console.log('[TokenInterceptor] Token detected:', token.substring(0, 20) + '...')
  // Dispatch custom event for both Tauri and web environment
  window.dispatchEvent(
    new CustomEvent('token-captured', {
      detail: { token },
    }),
  )
}

function interceptFetch(): void {
  const originalFetch = window.fetch

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

    // Check URL for token
    const urlToken = extractTokenFromUrl(url)
    if (urlToken) {
      await handleTokenFound(urlToken)
    }

    const response = await originalFetch.call(this, input, init)

    // Check response headers for token
    const headerToken = extractTokenFromHeaders(response.headers)
    if (headerToken) {
      await handleTokenFound(headerToken)
    }

    // Clone response to read body without consuming it
    if (url.includes(TOKEN_ENDPOINT)) {
      try {
        const clonedResponse = response.clone()
        const body = await clonedResponse.text()

        // Try to extract token from JSON response
        try {
          const json = JSON.parse(body) as Record<string, unknown>
          const token = json.token as string | undefined
          const dataToken = (json.data as Record<string, unknown> | undefined)?.token as
            | string
            | undefined

          if (token && TOKEN_PATTERN.test(`Bearer ${token}`)) {
            await handleTokenFound(token)
          } else if (dataToken && TOKEN_PATTERN.test(`Bearer ${dataToken}`)) {
            await handleTokenFound(dataToken)
          }
        } catch {
          // Not JSON, try regex
          const tokenMatch = body.match(TOKEN_PATTERN)
          if (tokenMatch) {
            await handleTokenFound(tokenMatch[0].replace('Bearer ', ''))
          }
        }
      } catch {
        // Failed to read response body
      }
    }

    return response
  }
}

function interceptXHR(): void {
  const originalOpen = XMLHttpRequest.prototype.open
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader
  const originalSend = XMLHttpRequest.prototype.send

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async: boolean = true,
    username?: string | null,
    password?: string | null,
  ): void {
    const xhr = this as XMLHttpRequest & { _interceptUrl?: string }
    xhr._interceptUrl = typeof url === 'string' ? url : url.toString()
    return originalOpen.call(this, method, url, async, username, password)
  }

  XMLHttpRequest.prototype.setRequestHeader = function (name: string, value: string): void {
    if (name.toLowerCase() === 'token' && TOKEN_PATTERN.test(value)) {
      handleTokenFound(value.replace('Bearer ', ''))
    }
    return originalSetRequestHeader.call(this, name, value)
  }

  XMLHttpRequest.prototype.send = function (
    body?: Document | XMLHttpRequestBodyInit | null | undefined,
  ): void {
    const xhr = this as XMLHttpRequest & { _interceptUrl?: string }
    const url = xhr._interceptUrl || ''

    // Check URL for token
    const urlToken = extractTokenFromUrl(url)
    if (urlToken) {
      handleTokenFound(urlToken)
    }

    // Listen for response
    xhr.addEventListener('load', function () {
      // Check response headers
      const tokenHeader = xhr.getResponseHeader('token')
      if (tokenHeader && TOKEN_PATTERN.test(tokenHeader)) {
        handleTokenFound(tokenHeader.replace('Bearer ', ''))
      }

      // Check response body for token endpoint
      if (url.includes(TOKEN_ENDPOINT)) {
        try {
          const responseText = xhr.responseText
          try {
            const json = JSON.parse(responseText) as Record<string, unknown>
            const token = json.token as string | undefined
            const dataToken = (json.data as Record<string, unknown> | undefined)?.token as
              | string
              | undefined

            if (token && TOKEN_PATTERN.test(`Bearer ${token}`)) {
              handleTokenFound(token)
            } else if (dataToken && TOKEN_PATTERN.test(`Bearer ${dataToken}`)) {
              handleTokenFound(dataToken)
            }
          } catch {
            const tokenMatch = responseText.match(TOKEN_PATTERN)
            if (tokenMatch) {
              handleTokenFound(tokenMatch[0].replace('Bearer ', ''))
            }
          }
        } catch {
          // Failed to read response
        }
      }
    })

    return originalSend.call(this, body)
  }
}

function monitorNavigation(): void {
  // Monitor hash changes (SPA navigation)
  let lastUrl = window.location.href

  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href
      const urlToken = extractTokenFromUrl(lastUrl)
      if (urlToken) {
        handleTokenFound(urlToken)
      }
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })

  // Also listen for popstate
  window.addEventListener('popstate', () => {
    const urlToken = extractTokenFromUrl(window.location.href)
    if (urlToken) {
      handleTokenFound(urlToken)
    }
  })
}

export function initTokenInterceptor(): void {
  console.log('[TokenInterceptor] Initializing...')
  interceptFetch()
  interceptXHR()
  monitorNavigation()
  console.log('[TokenInterceptor] Ready')
}

export function isTokenCapturedEvent(event: Event): event is CustomEvent<{ token: string }> {
  return (
    event.type === 'token-captured' &&
    'detail' in event &&
    typeof (event as CustomEvent).detail === 'object' &&
    (event as CustomEvent<{ token: string }>).detail !== null &&
    'token' in (event as CustomEvent<{ token: string }>).detail
  )
}
