import { Text, View } from "react-native"

import type { Verse } from "@/bible/texts"
import { fontFamily } from "@/theme/fonts"
import { spacing } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"

/** How a reader shows the text (Settings of the reader, as on the web). */
export type ReaderLook = {
  /** 0 small … 3 very large. */
  size: 0 | 1 | 2 | 3
  verseNumbers: boolean
  layout: "flow" | "lines"
}

export const defaultReaderLook: ReaderLook = {
  size: 1,
  verseNumbers: true,
  layout: "flow",
}

const fontSizes = [16, 18, 21, 24] as const

/** Verses in Lora, numbered in gold, flowing or one per line. */
export function ChapterText({
  verses,
  look,
}: {
  verses: readonly Verse[]
  look: ReaderLook
}) {
  const styles = useThemedStyles(themedStyles)
  const fontSize = fontSizes[look.size]
  const text = { fontSize, lineHeight: Math.round(fontSize * 1.7) }
  const number = (verse: number) =>
    look.verseNumbers ? (
      <Text style={[styles.number, { fontSize: fontSize * 0.65 }]}>
        {verse}{" "}
      </Text>
    ) : null

  if (look.layout === "lines") {
    return (
      <View style={styles.lines}>
        {verses.map(([verse, words]) => (
          <Text key={verse} style={[styles.text, text]}>
            {number(verse)}
            {words}
          </Text>
        ))}
      </View>
    )
  }
  return (
    <Text style={[styles.text, text]}>
      {verses.map(([verse, words]) => (
        <Text key={verse}>
          {number(verse)}
          {words}{" "}
        </Text>
      ))}
    </Text>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  text: { fontFamily: fontFamily.scripture, color: colors.foreground },
  number: { fontFamily: fontFamily.semibold, color: colors.accent },
  lines: { gap: spacing.sm },
}))
