import { Reader } from "@/components/bible/reader"
import { setPreferences, usePreferences } from "@/lib/preferences"

/** Where the reader starts on a new phone. */
const firstPassage = "John.1"

/** The Bible tab opens on the last passage read. */
export default function BibleScreen() {
  const { lastPassage } = usePreferences()
  return (
    <Reader
      slug={lastPassage ?? firstPassage}
      onGo={(slug) => setPreferences({ lastPassage: slug })}
    />
  )
}
