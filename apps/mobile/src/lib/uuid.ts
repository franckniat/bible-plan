/**
 * A UUID version 7 (RFC 9562): 48 bits of Unix time in milliseconds, then
 * random bits. Ids made on the phone sort by creation time, like the
 * server's uuid(7), so a record keeps the same id everywhere. `random` gives
 * 10 random bytes (expo-crypto on the phone, see ids.ts).
 */
export function uuidv7(now: number, random: Uint8Array): string {
  if (random.length < 10) throw new Error("uuidv7 needs 10 random bytes")
  const bytes = new Uint8Array(16)
  let time = Math.floor(now)
  for (let index = 5; index >= 0; index--) {
    bytes[index] = time % 256
    time = Math.floor(time / 256)
  }
  bytes.set(random.subarray(0, 10), 6)
  bytes[6] = 0x70 | (bytes[6]! & 0x0f) // version 7
  bytes[8] = 0x80 | (bytes[8]! & 0x3f) // variant 10
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"))
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10).join(""),
  ].join("-")
}
