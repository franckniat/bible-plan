import {
  formatPassage,
  parsePassageSlug,
  parseReference,
  toPassageSlug,
  type Locale,
} from "@workspace/core"

/**
 * The passage slug for a reference typed by a person ("Jn 3:16", "Psaume
 * 23"), or null when it is not exactly one passage of the canon.
 */
export function slugFromText(text: string, locale: Locale): string | null {
  const passages = parseReference(text, { locale })
  return passages?.length === 1 ? toPassageSlug(passages[0]!) : null
}

/** A passage slug written for people, in their language ("Jean 3:16"). */
export function labelOfSlug(slug: string, locale: Locale): string {
  const passage = parsePassageSlug(slug)
  return passage ? formatPassage(passage, locale) : slug
}
