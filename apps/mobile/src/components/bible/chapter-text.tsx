import { displayVerse, type BibleVersionId } from "@workspace/bible-data"
import type { HighlightColor } from "@workspace/core"
import { View, type GestureResponderEvent } from "react-native"

import type { Verse } from "@/bible/texts"
import { MarkedText, type MarkedPart } from "@/components/bible/marked-text"
import type { Preferences } from "@/lib/preferences"
import { fontFamily } from "@/theme/fonts"
import { spacing } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"
import { useColors } from "@/theme/use-colors"

/** How a reader shows the text: size 0 (small) to 3, numbers, layout. */
export type ReaderLook = Preferences["reader"]

const fontSizes = [16, 18, 21, 24] as const

/** The space between lines, as a multiple of the font size. */
const lineHeightFactors: Record<ReaderLook["lineHeight"], number> = {
  compact: 1.5,
  normal: 1.7,
  wide: 2,
  wider: 2.3,
}

/** The highlight colors of the web (Tailwind 300), dark text on them. */
export const highlightBackgrounds: Record<HighlightColor, string> = {
  YELLOW: "#fde047",
  ORANGE: "#fdba74",
  GREEN: "#86efac",
  BLUE: "#7dd3fc",
  PURPLE: "#c4b5fd",
  PINK: "#f9a8d4",
}

/** A darker shade of each color, for the verse number's chip on it. */
const chipBackgrounds: Record<HighlightColor, string> = {
  YELLOW: "#facc15",
  ORANGE: "#fb923c",
  GREEN: "#4ade80",
  BLUE: "#38bdf8",
  PURPLE: "#a78bfa",
  PINK: "#f472b6",
}

/** Dark letters on the light bands. */
const onBand = "#0a0a0a"

/**
 * Verses in Lora, numbered in gold, flowing or one per line, as on the web:
 * paragraphs and the translators' words in italics (King James Version)
 * through bible-data's displayVerse. A highlighted verse has a rounded band
 * behind its letters only, its number in a chip of its own; a selected verse
 * (tapped) a dotted line under its words, as on the web (MarkedText).
 */
export function ChapterText({
  version,
  verses,
  look,
  highlights = {},
  selected = [],
  onPressVerse,
  onVerseTops,
}: {
  version: BibleVersionId
  verses: readonly Verse[]
  look: ReaderLook
  /** The color of each highlighted verse, in the version's numbering. */
  highlights?: Readonly<Record<number, HighlightColor>>
  selected?: readonly number[]
  /** A verse tapped, with where (its height on the screen). */
  onPressVerse?: (verse: number, pageY: number) => void
  /** Where each verse starts, from the top of the text, once laid out. */
  onVerseTops?: (tops: Record<number, number>) => void
}) {
  const styles = useThemedStyles(themedStyles)
  const colors = useColors()
  const fontSize = fontSizes[look.size]
  const geist = look.font === "geist"
  const text = [
    styles.text,
    geist ? { fontFamily: fontFamily.regular } : null,
    {
      fontSize,
      lineHeight: Math.round(fontSize * lineHeightFactors[look.lineHeight]),
    },
  ]

  /** The parts of a verse: its number, its words, and the spaces between. */
  const partsOf = (
    [number, words]: Verse,
    index: number,
    flow: boolean
  ): MarkedPart[] => {
    const { paragraph, segments } = displayVerse(version, words)
    const color = highlights[number]
    const isSelected = selected.includes(number)
    const band = color ? highlightBackgrounds[color] : null
    const chip = color ? chipBackgrounds[color] : null
    // Gold dots, dark on a highlight to stay visible.
    const dots = isSelected
      ? { color: band ? onBand : colors.accent, group: `${number}` }
      : undefined
    const onPress = onPressVerse
      ? (event: GestureResponderEvent) =>
          onPressVerse(number, event.nativeEvent.pageY)
      : undefined
    // The first part of a verse marks where it starts.
    const parts: MarkedPart[] = []
    const anchor = `${number}`
    // A new paragraph starts on its own line, after text shown above.
    if (flow && paragraph && index > 0) {
      parts.push({ key: `${number}-p`, text: "\n" })
    }
    if (look.verseNumbers) {
      parts.push({
        key: `${number}-n`,
        text: String(number),
        style: [
          styles.number,
          { fontSize: fontSize * 0.65 },
          chip ? { color: onBand } : null,
        ],
        mark: chip ? { color: chip, group: `${number}-n` } : undefined,
        anchor,
        onPress,
      })
      parts.push({ key: `${number}-s`, text: " ", onPress })
    }
    segments.forEach((segment, part) => {
      parts.push({
        key: `${number}-${part}`,
        text: segment.text,
        style: [
          segment.italic
            ? geist
              ? { fontStyle: "italic" as const }
              : styles.italic
            : null,
          band ? { color: onBand } : null,
        ],
        mark: band ? { color: band, group: `${number}` } : undefined,
        underline: dots,
        anchor: !look.verseNumbers && part === 0 ? anchor : undefined,
        onPress,
      })
    })
    if (flow) parts.push({ key: `${number}-e`, text: " ", onPress })
    return parts
  }

  if (look.layout === "lines") {
    return (
      <View style={styles.lines}>
        {verses.map((item, index) => (
          // One verse a line: where it starts is where its own text is.
          <View
            key={item[0]}
            onLayout={(event) =>
              onVerseTops?.({ [item[0]]: event.nativeEvent.layout.y })
            }
          >
            <MarkedText style={text} parts={partsOf(item, index, false)} />
          </View>
        ))}
      </View>
    )
  }
  return (
    <MarkedText
      style={text}
      parts={verses.flatMap((item, index) => partsOf(item, index, true))}
      onAnchors={
        onVerseTops
          ? (tops) =>
              onVerseTops(
                Object.fromEntries(
                  Object.entries(tops).map(([verse, y]) => [Number(verse), y])
                )
              )
          : undefined
      }
    />
  )
}

const themedStyles = createThemedStyles((colors) => ({
  text: { fontFamily: fontFamily.scripture, color: colors.foreground },
  italic: { fontFamily: fontFamily.scriptureItalic },
  number: { fontFamily: fontFamily.semibold, color: colors.accent },
  lines: { gap: spacing.sm },
}))
