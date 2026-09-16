/** `cookies()` for route handlers under test. Set via __setCookies. */
let store = new Map<string, string>()
export function __setCookies(entries: Record<string, string>) {
  store = new Map(Object.entries(entries))
}
export async function cookies() {
  return { get: (k: string) => (store.has(k) ? { name: k, value: store.get(k)! } : undefined) }
}
