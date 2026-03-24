export function isTauriEnvironment(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof (window as any).__TAURI_INTERNALS__ !== 'undefined'
}
