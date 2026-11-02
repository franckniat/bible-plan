import type { BibleVersionId } from "@workspace/bible-data"
import { chaptersPassage, type BookId } from "@workspace/core"
import { ActivityIndicator } from "react-native"

import { usePassage } from "@/bible/use-passage"
import { ChapterText, type ReaderLook } from "@/components/bible/chapter-text"
import { TabScreen } from "@/components/screen"
import { useReaderBackground } from "@/theme/reader-backgrounds"
import { useColors } from "@/theme/use-colors"

/**
 * A chapter next to the one read, loaded ahead so that it is already there
 * when the finger brings it in.
 */
export function NeighborChapter({
  book,
  chapter,
  version,
  look,
}: {
  book: BookId
  chapter: number
  version: BibleVersionId
  look: ReaderLook
}) {
  const colors = useColors()
  const background = useReaderBackground()
  const state = usePassage(chaptersPassage(book, chapter), version)
  return (
    <TabScreen backgroundColor={background}>
      {state.status === "ready" ? (
        state.text.chapters.map(({ chapter: number, verses }) => (
          <ChapterText
            key={number}
            version={version}
            verses={verses}
            look={look}
          />
        ))
      ) : (
        <ActivityIndicator color={colors.accent} />
      )}
    </TabScreen>
  )
}
