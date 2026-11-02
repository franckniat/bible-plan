import { useState, type ReactNode } from "react"
import {
  Platform,
  Text,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type TextLayoutEvent,
  type TextStyle,
} from "react-native"

/** A mark of a run of text; parts in a row with one group make one mark. */
type Mark = { color: string; group: string }

/**
 * A run of text, maybe marked: a color painted behind its letters (a
 * highlight), a dotted line under them (a selection), or both.
 */
export type MarkedPart = {
  key: string
  text: string
  style?: StyleProp<TextStyle>
  mark?: Mark
  underline?: Mark
  /** Its line's top is told to `onAnchors` under this name (a verse). */
  anchor?: string
  onPress?: (event: GestureResponderEvent) => void
}

/** A band behind the letters, or dots under them. */
type Kind = "band" | "dots"

/** A line of text laid out natively. */
type TextLayoutLine = TextLayoutEvent["nativeEvent"]["lines"][number]

type Band = { start: number; end: number; color: string; kind: Kind }
type Rect = { left: number; top: number; width: number; height: number }

/** Room around the letters, and the roundness of a band. */
const padX = 4
const padY = 2
const radius = 7
/** The dots of a selection: their size, their step, under the baseline. */
const dot = 2.5
const dotStep = 5
const dotsBelow = 3

/** The marks of the parts: their marked runs, by offset in the text. */
export function bandsOf(parts: readonly MarkedPart[]): Band[] {
  const bands: Band[] = []
  for (const kind of ["band", "dots"] as const) {
    const markOf = (part: MarkedPart | null) =>
      kind === "band" ? part?.mark : part?.underline
    let offset = 0
    let previous: MarkedPart | null = null
    let last: Band | null = null
    for (const part of parts) {
      const end = offset + part.text.length
      const mark = markOf(part)
      if (mark) {
        if (
          last &&
          markOf(previous)?.group === mark.group &&
          last.end === offset
        ) {
          last.end = end
        } else {
          last = { start: offset, end, color: mark.color, kind }
          bands.push(last)
        }
      }
      previous = part
      offset = end
    }
  }
  return bands
}

/** The top of the line where each anchored part starts. */
export function anchorTops(
  parts: readonly MarkedPart[],
  lines: readonly TextLayoutLine[]
): Record<string, number> {
  const tops: Record<string, number> = {}
  let offset = 0
  for (const part of parts) {
    if (part.anchor) {
      let start = 0
      for (const line of lines) {
        if (offset < start + line.text.length) {
          tops[part.anchor] = line.y
          break
        }
        start += line.text.length
      }
    }
    offset += part.text.length
  }
  return tops
}

/** The parts between two offsets of the text, cut to them. */
export function slice(parts: readonly MarkedPart[], from: number, to: number) {
  const out: MarkedPart[] = []
  let offset = 0
  for (const part of parts) {
    const end = offset + part.text.length
    const a = Math.max(from, offset)
    const b = Math.min(to, end)
    if (a < b) {
      out.push({ ...part, text: part.text.slice(a - offset, b - offset) })
    }
    offset = end
  }
  return out
}

/** A piece of a band on one line: where it starts and ends in that line. */
type Piece = {
  line: number
  from: number
  to: number
  color: string
  kind: Kind
}

/** The bands cut by the lines, without the spaces at their ends. */
export function piecesOf(
  bands: readonly Band[],
  lines: readonly TextLayoutLine[]
) {
  const pieces: Piece[] = []
  let lineStart = 0
  lines.forEach((line, index) => {
    const lineEnd = lineStart + line.text.length
    for (const band of bands) {
      let from = Math.max(band.start, lineStart) - lineStart
      let to = Math.min(band.end, lineEnd) - lineStart
      while (from < to && /\s/.test(line.text[from]!)) from += 1
      while (to > from && /\s/.test(line.text[to - 1]!)) to -= 1
      if (from < to) {
        pieces.push({
          line: index,
          from,
          to,
          color: band.color,
          kind: band.kind,
        })
      }
    }
    lineStart = lineEnd
  })
  return pieces
}

/**
 * Text with colored bands behind some of its letters, and only behind the
 * letters: a rounded band on each line, as tall as the letters, whatever the
 * line height (React Native paints a span's background over the whole line);
 * and dotted lines just under some (its own underline crosses the text on
 * iOS with a line height).
 * The text is laid out once natively, then each band is measured from the
 * width of the line up to it. The web paints span backgrounds well: there,
 * the parts carry their own background.
 */
export function MarkedText({
  parts,
  style,
  onAnchors,
}: {
  parts: readonly MarkedPart[]
  /** The text's style, with its font size and line height. */
  style: StyleProp<TextStyle>
  /** The top of the line of each anchored part, once laid out natively. */
  onAnchors?: (tops: Record<string, number>) => void
}) {
  const [lines, setLines] = useState<readonly TextLayoutLine[] | null>(null)
  // Widths of line beginnings, by "line:offset"; "x" is the width of an x.
  const [widths, setWidths] = useState<Record<string, number>>({})
  const web = Platform.OS === "web"
  const bands = bandsOf(parts)

  const text = (
    <Text
      style={style}
      onTextLayout={
        web || (bands.length === 0 && !onAnchors)
          ? undefined
          : (event) => {
              const next = event.nativeEvent.lines
              if (JSON.stringify(lines) === JSON.stringify(next)) return
              if (onAnchors) onAnchors(anchorTops(parts, next))
              // Other lines: the widths measured for the former ones go.
              setLines(next)
              setWidths({})
            }
      }
    >
      {parts.map((part) => (
        <Text
          key={part.key}
          style={[
            part.style,
            web && part.mark ? { backgroundColor: part.mark.color } : null,
            web && part.underline
              ? {
                  textDecorationLine: "underline",
                  textDecorationStyle: "dotted",
                  textDecorationColor: part.underline.color,
                }
              : null,
          ]}
          onPress={part.onPress}
          // No grey block over a verse tapped (iOS's pressed text).
          suppressHighlighting
        >
          {part.text}
        </Text>
      ))}
    </Text>
  )
  if (web || bands.length === 0) return text

  // The line texts must give back the whole text, or nothing is drawn.
  const full = parts.map((part) => part.text).join("")
  const usable =
    lines !== null && lines.map((line) => line.text).join("") === full
  const pieces = usable ? piecesOf(bands, lines) : []
  const lineStarts: number[] = []
  if (usable) {
    lines.reduce((start, line) => {
      lineStarts.push(start)
      return start + line.text.length
    }, 0)
  }

  // What still needs measuring: the start and the end of each piece.
  const needed = new Set<string>(["x"])
  for (const piece of pieces) {
    needed.add(`${piece.line}:${piece.from}`)
    needed.add(`${piece.line}:${piece.to}`)
  }
  const measure = (key: string, children: ReactNode) => (
    <Text
      key={key}
      style={[style, { position: "absolute", left: 0, top: 0, opacity: 0 }]}
      numberOfLines={1}
      onTextLayout={(event) => {
        const width = event.nativeEvent.lines[0]?.width ?? 0
        setWidths((current) =>
          current[key] === width ? current : { ...current, [key]: width }
        )
      }}
    >
      {children}
    </Text>
  )
  const probes = [...needed]
    .filter((key) => widths[key] === undefined)
    .map((key) => {
      if (key === "x") return measure(key, "x")
      const [line, offset] = key.split(":").map(Number) as [number, number]
      const start = lineStarts[line]!
      // An "x" after the beginning keeps its last spaces counted.
      return measure(
        key,
        <>
          {slice(parts, start, start + offset).map((part) => (
            <Text key={part.key} style={part.style}>
              {part.text}
            </Text>
          ))}
          x
        </>
      )
    })

  const x = widths.x
  const rects: (Rect & { color: string; key: string; kind: Kind })[] = []
  if (x !== undefined) {
    for (const piece of pieces) {
      const from = widths[`${piece.line}:${piece.from}`]
      const to = widths[`${piece.line}:${piece.to}`]
      if (from === undefined || to === undefined) continue
      const line = lines![piece.line]!
      // The letters sit in the middle of the line's height.
      const letters = line.ascender + line.descender
      const top = line.y + (line.height - letters) / 2
      const left = line.x + from - x
      rects.push(
        piece.kind === "band"
          ? {
              key: `b${piece.line}:${piece.from}`,
              kind: "band",
              color: piece.color,
              left: left - padX,
              width: to - from + 2 * padX,
              top: top - padY,
              height: letters + 2 * padY,
            }
          : {
              // Dots just under the baseline, as the web's dotted line.
              key: `d${piece.line}:${piece.from}`,
              kind: "dots",
              color: piece.color,
              left,
              width: to - from,
              top: top + line.ascender + dotsBelow,
              height: dot,
            }
      )
    }
  }

  return (
    <View>
      {/* Bands behind the text, dots over it. */}
      {rects
        .filter((rect) => rect.kind === "band")
        .map(({ key, color, left, top, width, height }) => (
          <View
            key={key}
            pointerEvents="none"
            style={{
              position: "absolute",
              left,
              top,
              width,
              height,
              borderRadius: radius,
              backgroundColor: color,
            }}
          />
        ))}
      {text}
      {rects
        .filter((rect) => rect.kind === "dots")
        .map(({ key, color, left, top, width, height }) => (
          <View
            key={key}
            pointerEvents="none"
            style={{
              position: "absolute",
              left,
              top,
              width,
              height,
              flexDirection: "row",
              overflow: "hidden",
              gap: dotStep - dot,
            }}
          >
            {Array.from(
              { length: Math.floor(width / dotStep) + 1 },
              (_, index) => (
                <View
                  key={index}
                  style={{
                    width: dot,
                    height: dot,
                    borderRadius: dot / 2,
                    backgroundColor: color,
                  }}
                />
              )
            )}
          </View>
        ))}
      {/* Measured unseen: wide enough not to wrap, clipped to nothing. */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden",
        }}
      >
        <View style={{ position: "absolute", left: 0, top: 0, width: 10000 }}>
          {probes}
        </View>
      </View>
    </View>
  )
}
