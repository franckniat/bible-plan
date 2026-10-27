import { displayVerse, type BibleVersionId } from "@workspace/bible-data"
import { Fragment } from "react"
import { Text, View } from "react-native"

import type { Verse } from "@/bible/texts"
import type { Preferences } from "@/lib/preferences"
import { fontFamily } from "@/theme/fonts"
import { spacing } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"

/** How a reader shows the text: size 0 (small) to 3, numbers, layout. */
export type ReaderLook = Preferences["reader"]

const fontSizes = [16, 18, 21, 24] as const

/**
 * Verses in Lora, numbered in gold, flowing or one per line, as on the web:
 * paragraphs and the translators' words in italics (King James Version)
 * through bible-data's displayVerse.
 */
export function ChapterText({
  version,
  verses,
  look,
}: {
  version: BibleVersionId
  verses: readonly Verse[]
  look: ReaderLook
}) {
  const styles = useThemedStyles(themedStyles)
  const fontSize = fontSizes[look.size]
  const text = { fontSize, lineHeight: Math.round(fontSize * 1.7) }

  const verse = ([number, words]: Verse, index: number, flow: boolean) => {
    const { paragraph, segments } = displayVerse(version, words)
    return (
      <Fragment key={number}>
        {/* A new paragraph starts on its own line, after text shown above. */}
        {flow && paragraph && index > 0 ? "\n" : null}
        {look.verseNumbers ? (
          <Text style={[styles.number, { fontSize: fontSize * 0.65 }]}>
            {number}{" "}
          </Text>
        ) : null}
        {segments.map((segment, part) => (
          <Text key={part} style={segment.italic ? styles.italic : null}>
            {segment.text}
          </Text>
        ))}
        {flow ? " " : null}
      </Fragment>
    )
  }

  if (look.layout === "lines") {
    return (
      <View style={styles.lines}>
        {verses.map((item, index) => (
          <Text key={item[0]} style={[styles.text, text]}>
            {verse(item, index, false)}
          </Text>
        ))}
      </View>
    )
  }
  return (
    <Text style={[styles.text, text]}>
      {verses.map((item, index) => verse(item, index, true))}
    </Text>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  text: { fontFamily: fontFamily.scripture, color: colors.foreground },
  italic: { fontFamily: fontFamily.scriptureItalic },
  number: { fontFamily: fontFamily.semibold, color: colors.accent },
  lines: { gap: spacing.sm },
}))
