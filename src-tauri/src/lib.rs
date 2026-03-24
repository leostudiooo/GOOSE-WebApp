use tauri::{menu::Menu, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Use native system menu (includes About on macOS and Help->About on Windows/Linux).
            let menu = Menu::default(app.handle())?;
            app.set_menu(menu)?;

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![token_captured, open_login_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn token_captured(token: String, app: tauri::AppHandle) {
    log::info!(
        "[Rust] token_captured called with token: {}...",
        &token[..20.min(token.len())]
    );
    let _ = app.emit("token-captured", &token);
    if let Some(window) = app.get_webview_window("cas-login") {
        let _ = window.close();
    }
}

const TOKEN_INTERCEPTOR_SCRIPT: &str = r#"
(function() {
  console.log('[TokenInterceptor] Script injected via initialization_script');
  
  const TOKEN_PATTERN = /Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/;
  const TOKEN_ENDPOINT = 'tokenH5-cas';
  
  let capturedToken = null;
  let tokenSent = false;

  function clearSessionCookies() {
    try {
      const cookies = document.cookie ? document.cookie.split(';') : [];
      for (const item of cookies) {
        const eqPos = item.indexOf('=');
        const name = (eqPos > -1 ? item.substring(0, eqPos) : item).trim();
        if (!name) continue;

        const host = window.location.hostname;
        const parts = host.split('.');
        const domains = [host];
        if (parts.length > 2) {
          domains.push('.' + parts.slice(-2).join('.'));
        }

        const paths = ['/', '/h5', '/dist'];
        for (const path of paths) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path}`;
          for (const domain of domains) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path};domain=${domain}`;
          }
        }
      }
      console.log('[TokenInterceptor] Session cookies cleared for current domain');
    } catch (e) {
      console.warn('[TokenInterceptor] Failed to clear session cookies:', e);
    }
  }

  clearSessionCookies();

  function getTauriInvoke() {
    if (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === 'function') {
      return window.__TAURI_INTERNALS__.invoke.bind(window.__TAURI_INTERNALS__);
    }
    if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
      return window.__TAURI__.core.invoke.bind(window.__TAURI__.core);
    }
    return null;
  }

  async function handleTokenFound(token) {
    if (tokenSent) return;
    console.log('[TokenInterceptor] Token detected:', token.substring(0, 20) + '...');
    capturedToken = token;
    
    // Wait for Tauri API to be ready, then send
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max
    
    const trySend = () => {
      attempts++;
      const invoke = getTauriInvoke();
      if (invoke) {
        console.log('[TokenInterceptor] Sending token to Rust...');
        invoke('token_captured', { token: capturedToken })
          .then(() => {
            console.log('[TokenInterceptor] Token sent successfully');
            tokenSent = true;
          })
          .catch(e => {
            console.error('[TokenInterceptor] Failed to send:', e);
          });
      } else if (attempts < maxAttempts) {
        setTimeout(trySend, 100);
      } else {
        console.error('[TokenInterceptor] Tauri API not ready after', maxAttempts, 'attempts');
      }
    };
    
    trySend();
  }

  function extractTokenFromUrl(url) {
    if (!url || !url.includes(TOKEN_ENDPOINT)) return null;
    try {
      const urlObj = new URL(url, window.location.origin);
      const tokenParam = urlObj.searchParams.get('token');
      if (tokenParam && TOKEN_PATTERN.test('Bearer ' + tokenParam)) {
        return tokenParam;
      }
    } catch (e) {}
    return null;
  }

  function extractTokenFromHeaders(headers) {
    let tokenHeader = null;
    if (headers instanceof Headers) {
      tokenHeader = headers.get('token') || headers.get('Token');
    } else if (headers && typeof headers === 'object') {
      tokenHeader = headers['token'] || headers['Token'];
    }
    if (tokenHeader && TOKEN_PATTERN.test(tokenHeader)) {
      return tokenHeader.replace('Bearer ', '');
    }
    return null;
  }

  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input && input.url) || '';
    const urlToken = extractTokenFromUrl(url);
    if (urlToken) await handleTokenFound(urlToken);

    const response = await originalFetch.call(this, input, init);
    const headerToken = extractTokenFromHeaders(response.headers);
    if (headerToken) await handleTokenFound(headerToken);

    if (url && url.includes(TOKEN_ENDPOINT)) {
      try {
        const clonedResponse = response.clone();
        const body = await clonedResponse.text();
        try {
          const json = JSON.parse(body);
          const token = json.token;
          const dataToken = json.data && json.data.token;
          if (token && TOKEN_PATTERN.test('Bearer ' + token)) {
            await handleTokenFound(token);
          } else if (dataToken && TOKEN_PATTERN.test('Bearer ' + dataToken)) {
            await handleTokenFound(dataToken);
          }
        } catch {
          const tokenMatch = body.match(TOKEN_PATTERN);
          if (tokenMatch) {
            await handleTokenFound(tokenMatch[0].replace('Bearer ', ''));
          }
        }
      } catch {}
    }
    return response;
  };

  // Intercept XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, async, username, password) {
    this._interceptUrl = typeof url === 'string' ? url : url.toString();
    return originalOpen.call(this, method, url, async !== undefined ? async : true, username, password);
  };

  XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
    if (name.toLowerCase() === 'token' && TOKEN_PATTERN.test(value)) {
      handleTokenFound(value.replace('Bearer ', ''));
    }
    return originalSetRequestHeader.call(this, name, value);
  };

  XMLHttpRequest.prototype.send = function(body) {
    const url = this._interceptUrl || '';
    const urlToken = extractTokenFromUrl(url);
    if (urlToken) handleTokenFound(urlToken);

    this.addEventListener('load', function() {
      const tokenHeader = this.getResponseHeader('token');
      if (tokenHeader && TOKEN_PATTERN.test(tokenHeader)) {
        handleTokenFound(tokenHeader.replace('Bearer ', ''));
      }
      if (url && url.includes(TOKEN_ENDPOINT)) {
        try {
          const responseText = this.responseText;
          try {
            const json = JSON.parse(responseText);
            const token = json.token;
            const dataToken = json.data && json.data.token;
            if (token && TOKEN_PATTERN.test('Bearer ' + token)) {
              handleTokenFound(token);
            } else if (dataToken && TOKEN_PATTERN.test('Bearer ' + dataToken)) {
              handleTokenFound(dataToken);
            }
          } catch {
            const tokenMatch = responseText.match(TOKEN_PATTERN);
            if (tokenMatch) {
              handleTokenFound(tokenMatch[0].replace('Bearer ', ''));
            }
          }
        } catch {}
      }
    });
    return originalSend.call(this, body);
  };

  // Monitor URL changes
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      const urlToken = extractTokenFromUrl(lastUrl);
      if (urlToken) handleTokenFound(urlToken);
    }
  });
  
  // Start observing after DOM is ready
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  window.addEventListener('popstate', function() {
    const urlToken = extractTokenFromUrl(window.location.href);
    if (urlToken) handleTokenFound(urlToken);
  });

  console.log('[TokenInterceptor] Ready - intercepting requests');
})();
"#;

#[tauri::command]
fn open_login_window(app: tauri::AppHandle) -> Result<(), String> {
    log::info!("[Rust] open_login_window called");

    // Check if window already exists
    if let Some(window) = app.get_webview_window("cas-login") {
        let _ = window.close();
    }

    let miniapp_url = "https://tyxsjpt.seu.edu.cn/h5/#/pages/home/index";
    let webview_url = WebviewUrl::External(
        miniapp_url
            .parse()
            .map_err(|e| format!("Invalid URL: {}", e))?,
    );

    WebviewWindowBuilder::new(&app, "cas-login", webview_url)
        .title("登录 - 运动打卡")
        .inner_size(500.0, 700.0)
        .incognito(true)
        .resizable(true)
        .center()
        .initialization_script(TOKEN_INTERCEPTOR_SCRIPT)
        .build()
        .map_err(|e| format!("Failed to create window: {}", e))?;

    log::info!("[Rust] Login window created with initialization_script");
    Ok(())
}
