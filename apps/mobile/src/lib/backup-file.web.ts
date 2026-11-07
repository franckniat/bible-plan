import * as DocumentPicker from "expo-document-picker"

import type { Backup } from "@/repositories/backup"

import { backupFileName } from "./backup-file"

/** In the browser preview, the backup is downloaded as a file. */
export async function shareBackupFile(backup: Backup) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(backup)], { type: "application/json" })
  )
  const link = document.createElement("a")
  link.href = url
  link.download = backupFileName(backup)
  link.click()
  URL.revokeObjectURL(url)
}

/** In the browser preview, the file is picked and read by the browser. */
export async function pickBackupFile(): Promise<string | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: "application/json",
  })
  const asset = picked.canceled ? undefined : picked.assets[0]
  return asset ? (await fetch(asset.uri)).text() : null
}
