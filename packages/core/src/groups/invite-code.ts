/**
 * Letters and digits that cannot be mistaken for one another (no 0 and O, no 1
 * and I and L), since a code is also read aloud and typed by hand.
 */
const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

export const inviteCodeLength = 8

/**
 * A new invitation code. `randomInt` gives an integer from 0 up to (not
 * including) its argument; it must be a cryptographic one (node:crypto's
 * `randomInt`) outside of tests. 31^8 codes: too many to guess.
 */
export function generateInviteCode(
  randomInt: (max: number) => number
): string {
  return Array.from(
    { length: inviteCodeLength },
    () => alphabet[randomInt(alphabet.length)]!
  ).join("")
}

/**
 * What a person typed or pasted as a code ("abcd-efgh", " ABCD EFGH "), put in
 * the form stored in the database, or null if it cannot be a code.
 */
export function normalizeInviteCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[^A-Z0-9]/g, "")
  return code.length === inviteCodeLength &&
    [...code].every((char) => alphabet.includes(char))
    ? code
    : null
}

/** A code in two groups of four, easier to read: "ABCD-EFGH". */
export function formatInviteCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`
}
