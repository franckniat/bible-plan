import { Directory, File, Paths } from "expo-file-system"

/** Downloaded versions live with the app's documents, one file each. */
const folder = () => new Directory(Paths.document, "bible")
const fileOf = (version: string) => new File(folder(), `${version}.json`)

/** Downloads a version's file, replacing an older copy. */
export async function downloadVersionFile(version: string, url: string) {
  folder().create({ intermediates: true, idempotent: true })
  await File.downloadFileAsync(url, fileOf(version), { idempotent: true })
}

export function readVersionFile(version: string): Promise<string> {
  return fileOf(version).text()
}

export function deleteVersionFile(version: string): void {
  const file = fileOf(version)
  if (file.exists) file.delete()
}
