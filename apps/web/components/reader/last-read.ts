// The last passage opened in the reader, kept on the device so that the
// Bible page can offer to resume reading.
const STORAGE_KEY = "bible-plan:last-read"

export function saveLastRead(slug: string) {
  try {
    localStorage.setItem(STORAGE_KEY, slug)
  } catch {
    // Private browsing: nothing to resume later.
  }
}

export function readLastRead(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ""
  } catch {
    return ""
  }
}
