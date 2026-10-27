import { File } from "expo-file-system"

/** The text of a downloaded asset file on the phone. */
export function readAsset(uri: string): Promise<string> {
  return new File(uri).text()
}
