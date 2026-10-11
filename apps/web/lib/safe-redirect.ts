/**
 * A same-site path to go back to after signing in, or the fallback. Only
 * relative paths are accepted, to avoid open redirects ("//evil.com",
 * "https://evil.com", "/\\evil.com").
 */
export function getSafeRedirect(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  ) {
    return fallback
  }
  return value
}
