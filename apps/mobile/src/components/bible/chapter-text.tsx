import { displayVerse, type BibleVersionId } from "@workspace/bible-data"
import type { HighlightColor } from "@workspace/core"
import { Text, View } from "react-native"

import type { Verse } from "@/bible/texts"
import type { Preferences } from "@/lib/preferences"
import { fontFamily } from "@/theme/fonts"
import { spacing } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"

/** How a reader shows the text: size 0 (small) to 3, numbers, layout. */
export type ReaderLook = Preferences["reader"]

const fontSizes = [16, 18, 21, 24] as const

/** The highlight colors of the web (Tailwind 300), dark text on them. */
export const highlightBackgrounds: Record<HighlightColor, string> = {
  YELLOW: "#fde047",
  ORANGE: "#fdba74",
  GREEN: "#86efac",
  BLUE: "#7dd3fc",
  PURPLE: "#c4b5fd",
  PINK: "#f9a8d4",
}

/**
 * Verses in Lora, numbered in gold, flowing or one per line, as on the web:
 * paragraphs and the translators' words in italics (King James Version)
 * through bible-data's displayVerse. Verses can be tapped to select them,
 * and show their highlight color.
 */
export function ChapterText({
  version,
  verses,
  look,
  highlights = {},
  selected = [],
  onPressVerse,
}: {
  version: BibleVersionId
  verses: readonly Verse[]
  look: ReaderLook
  /** The color of each highlighted verse, in the version's numbering. */
  highlights?: Readonly<Record<number, HighlightColor>>
  selected?: readonly number[]
  /** A verse tapped, with where (its height on the screen). */
  onPressVerse?: (verse: number, pageY: number) => void
}) {
  const styles = useThemedStyles(themedStyles)
  const fontSize = fontSizes[look.size]
  const text = { fontSize, lineHeight: Math.round(fontSize * 1.7) }

  const verse = ([number, words]: Verse, index: number, flow: boolean) => {
    const { paragraph, segments } = displayVerse(version, words)
    const color = highlights[number]
    const isSelected = selected.includes(number)
    return (
      <Text
        key={number}
        onPress={
          onPressVerse
            ? (event) => onPressVerse(number, event.nativeEvent.pageY)
            : undefined
        }
        accessibilityState={onPressVerse ? { selected: isSelected } : undefined}
        style={
          color
            ? { backgroundColor: highlightBackgrounds[color], color: "#0a0a0a" }
            : null
        }
      >
        {/* A new paragraph starts on its own line, after text shown above. */}
        {flow && paragraph && index > 0 ? "\n" : null}
        {look.verseNumbers ? (
          <Text style={[styles.number, { fontSize: fontSize * 0.65 }]}>
            {number}{" "}
          </Text>
        ) : null}
        {/* Only the words are marked when selected: not the number. */}
        {segments.map((segment, part) => (
          <Text
            key={part}
            style={[
              segment.italic && styles.italic,
              isSelected && styles.selected,
            ]}
          >
            {segment.text}
          </Text>
        ))}
        {flow ? " " : null}
      </Text>
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
  // Selected verses are underlined in gold, as on the web (a solid line:
  // Android draws no dotted one).
  selected: {
    textDecorationLine: "underline",
    textDecorationColor: colors.accent,
  },
  lines: { gap: spacing.sm },
}))
