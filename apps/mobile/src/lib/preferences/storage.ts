import { Storage } from "expo-sqlite/kv-store"

/** Synchronous key-value storage on the device (SQLite). */
export const storage = {
  get: (key: string) => Storage.getItemSync(key),
  set: (key: string, value: string) => Storage.setItemSync(key, value),
}
