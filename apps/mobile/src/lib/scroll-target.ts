/**
 * The verse to show when a passage opens ("go to a verse" in the book
 * picker): the reader scrolls to it once its text is laid out, then forgets.
 */
let target: { slug: string; verse: number } | null = null

export const scrollTarget = {
  set: (slug: string, verse: number) => {
    target = { slug, verse }
  },
  /** The verse to scroll to in this passage, if any. */
  peek: (slug: string) => (target?.slug === slug ? target.verse : null),
  clear: () => {
    target = null
  },
}
