/**
 * Public repository of the running code. The AGPL (section 13) requires
 * offering the source to network users: forks must point it to their own code.
 */
export const sourceCodeUrl =
  process.env.NEXT_PUBLIC_SOURCE_URL ||
  "https://github.com/franckniat/bible-plan"

/**
 * Address shown on the legal pages for privacy requests. Until it is set,
 * those pages point to the maintainer's GitHub profile.
 */
export const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || null

export const maintainerUrl = "https://github.com/franckniat"
