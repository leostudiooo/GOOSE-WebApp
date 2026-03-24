use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            token_captured,
            inject_token_interceptor
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn token_captured(token: String, app: tauri::AppHandle) {
    let _ = app.emit("token-captured", &token);
    if let Some(window) = app.get_webview_window("cas-login") {
        let _ = window.close();
    }
}

#[tauri::command]
fn inject_token_interceptor(app: tauri::AppHandle) {
    let script = r#"
    (function() {
      const TOKEN_PATTERN = /Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/;
      const TOKEN_ENDPOINT = 'tokenH5-cas';

      function extractTokenFromUrl(url) {
        if (!url.includes(TOKEN_ENDPOINT)) return null;
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
        const tokenHeader = headers instanceof Headers ? headers.get('token') : headers['token'] || headers['Token'];
        if (tokenHeader && TOKEN_PATTERN.test(tokenHeader)) {
          return tokenHeader.replace('Bearer ', '');
        }
        return null;
      }

      async function handleTokenFound(token) {
        console.log('[TokenInterceptor] Token detected:', token.substring(0, 20) + '...');
        try {
          await window.__TAURI__.core.invoke('token_captured', { token: token });
        } catch (e) {
          console.error('[TokenInterceptor] Failed to send token:', e);
        }
      }

      const originalFetch = window.fetch;
      window.fetch = async function(input, init) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        const urlToken = extractTokenFromUrl(url);
        if (urlToken) await handleTokenFound(urlToken);

        const response = await originalFetch.call(this, input, init);
        const headerToken = extractTokenFromHeaders(response.headers);
        if (headerToken) await handleTokenFound(headerToken);

        if (url.includes(TOKEN_ENDPOINT)) {
          try {
            const clonedResponse = response.clone();
            const body = await clonedResponse.text();
            try {
              const json = JSON.parse(body);
              const token = json.token;
              const dataToken = json.data?.token;
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

      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
      const originalSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function(method, url, async, username, password) {
        this._interceptUrl = typeof url === 'string' ? url : url.toString();
        return originalOpen.call(this, method, url, async, username, password);
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
          if (url.includes(TOKEN_ENDPOINT)) {
            try {
              const responseText = this.responseText;
              try {
                const json = JSON.parse(responseText);
                const token = json.token;
                const dataToken = json.data?.token;
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

      let lastUrl = window.location.href;
      const observer = new MutationObserver(() => {
        if (window.location.href !== lastUrl) {
          lastUrl = window.location.href;
          const urlToken = extractTokenFromUrl(lastUrl);
          if (urlToken) handleTokenFound(urlToken);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      window.addEventListener('popstate', () => {
        const urlToken = extractTokenFromUrl(window.location.href);
        if (urlToken) handleTokenFound(urlToken);
      });

      console.log('[TokenInterceptor] Ready');
    })();
  "#;

    if let Some(window) = app.get_webview_window("cas-login") {
        let _ = window.eval(script);
    }
}
