/** The text of an asset in the browser preview, served by Metro. */
export async function readAsset(uri: string): Promise<string> {
  const response = await fetch(uri)
  if (!response.ok) throw new Error(`${uri}: HTTP ${response.status}`)
  return response.text()
}
