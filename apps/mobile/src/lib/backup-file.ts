import * as DocumentPicker from "expo-document-picker"
import { File, Paths } from "expo-file-system"
import * as Sharing from "expo-sharing"

import type { Backup } from "@/repositories/backup"

/** The file's name, dated: "bible-plan-2026-11-07.json". */
export function backupFileName(backup: Backup): string {
  return `bible-plan-${backup.exportedAt.slice(0, 10)}.json`
}

/**
 * Writes a backup to a file of the app's cache, then opens the share sheet
 * (Files, AirDrop, mail…) to keep it somewhere else than the phone.
 */
export async function shareBackupFile(backup: Backup, title: string) {
  const file = new File(Paths.cache, backupFileName(backup))
  if (file.exists) file.delete()
  file.create()
  file.write(JSON.stringify(backup))
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    UTI: "public.json",
    dialogTitle: title,
  })
}

/** Lets the person pick a backup file; gives its text, or null if cancelled. */
export async function pickBackupFile(): Promise<string | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "public.json"],
    copyToCacheDirectory: true,
  })
  const asset = picked.canceled ? undefined : picked.assets[0]
  return asset ? new File(asset.uri).text() : null
}
