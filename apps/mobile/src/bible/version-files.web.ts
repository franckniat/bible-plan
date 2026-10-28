/**
 * The browser preview keeps downloaded versions in the Cache Storage: the
 * file system of the phone does not exist there.
 */
const cacheName = "bible-versions"
const keyOf = (version: string) => `/bible-versions/${version}.json`

export async function downloadVersionFile(version: string, url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  const cache = await caches.open(cacheName)
  await cache.put(keyOf(version), response)
}

export async function readVersionFile(version: string): Promise<string> {
  const cache = await caches.open(cacheName)
  const response = await cache.match(keyOf(version))
  if (!response) throw new Error(`${version} is not downloaded`)
  return response.text()
}
