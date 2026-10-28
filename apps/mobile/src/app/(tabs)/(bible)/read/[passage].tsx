import { router, useLocalSearchParams } from "expo-router"

import { Reader } from "@/components/bible/reader"

/**
 * A passage opened from a link, e.g. bibleplan://read/John.3, or from a plan
 * (`?reading=` its reading).
 */
export default function ReadScreen() {
  const { passage, reading } = useLocalSearchParams<{
    passage: string
    /** The plan reading it is, to mark it as read. */
    reading?: string
  }>()
  return (
    <Reader
      slug={passage}
      reading={reading}
      onGo={(slug) => router.replace(`/read/${slug}`)}
    />
  )
}
