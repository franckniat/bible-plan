import { router, useLocalSearchParams } from "expo-router"

import { Reader } from "@/components/bible/reader"

/** A passage opened from a link, e.g. bibleplan://read/John.3 */
export default function ReadScreen() {
  const { passage } = useLocalSearchParams<{ passage: string }>()
  return (
    <Reader slug={passage} onGo={(slug) => router.replace(`/read/${slug}`)} />
  )
}
