import { getRandomBytes } from "expo-crypto"

import { uuidv7 } from "./uuid"

/** A new id for a record made on this phone (a UUIDv7, see uuid.ts). */
export function newId(): string {
  return uuidv7(Date.now(), getRandomBytes(10))
}
