import type { Locale } from "@workspace/core"

/** What a person is called when nothing better is known. */
const fallback: Record<Locale, string> = { fr: "Utilisateur", en: "User" }

/**
 * A name for an account made without one (signing in with an e-mail link only
 * asks for the address): the part of the address before the "@", read as
 * words, "jean.dupont+bible@example.com" → "Jean Dupont". The person can
 * change it in their profile.
 *
 * The same rule is written in SQL in the migration that names the accounts
 * that already had no name: keep the two alike.
 */
export function nameFromEmail(email: string, locale: Locale): string {
  const local = email.split("@")[0]?.split("+")[0] ?? ""
  const words = local.split(/[._-]+/).filter(Boolean)
  if (words.length === 0) return fallback[locale]
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

/** The name given by the sign-up, or one made from the address when it is empty. */
export function nameOrFromEmail(
  name: string | null | undefined,
  email: string,
  locale: Locale
): string {
  const trimmed = name?.trim()
  return trimmed ? trimmed : nameFromEmail(email, locale)
}
