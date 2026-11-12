/**
 * Runs work that can wait once the phone is idle after the first screen
 * (at most `timeout` ms later), so that opening the app is not slowed by
 * it. Gives a function that cancels it.
 */
export function afterFirstScreen(work: () => void, timeout = 2000): () => void {
  const handle = requestIdleCallback(work, { timeout })
  return () => cancelIdleCallback(handle)
}
