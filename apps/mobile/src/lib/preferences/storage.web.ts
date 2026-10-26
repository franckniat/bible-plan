/**
 * The browser preview keeps preferences in localStorage: SQLite on the web
 * needs WebAssembly and cross-origin isolation, which the app never uses.
 */
export const storage = {
  get: (key: string) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value)
    } catch {
      // Private browsing: the preview just forgets.
    }
  },
}
