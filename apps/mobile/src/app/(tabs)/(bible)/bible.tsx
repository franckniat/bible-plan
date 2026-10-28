import { Reader } from "@/components/bible/reader"
import { recordReading, useReadingHistory } from "@/lib/reading-history"

/** Where the reader starts on a new phone. */
const firstPassage = "John.1"

/** The Bible tab opens on the last passage read. */
export default function BibleScreen() {
  const [last] = useReadingHistory()
  return <Reader slug={last?.slug ?? firstPassage} onGo={recordReading} />
}
