import { displayVerse, type BibleVersionId } from "@workspace/bible-data"
import {
  currentPeriod,
  findVerseOfTheDay,
  formatPassage,
  toPassageSlug,
  type IsoDate,
  type Locale,
  type Period,
} from "@workspace/core"
import { router } from "expo-router"
import {
  BookOpen,
  Moon,
  Sun,
  Sunrise,
  type LucideIcon,
} from "lucide-react-native"
import { useSyncExternalStore } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Mask,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg"
import { useLocale, useTranslations } from "use-intl"

import { usePassage } from "@/bible/use-passage"
import { haptics } from "@/lib/haptics"
import { brand } from "@/theme/colors"
import { fontFamily } from "@/theme/fonts"
import { radius, spacing, typography } from "@/theme/metrics"

const minute = 60_000

function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, minute)
  return () => clearInterval(timer)
}

const moon = "#f4ebd0"

/** The look of each moment, as on the web: its sky, its light, its sun or moon. */
const looks: Record<
  Period,
  {
    icon: LucideIcon
    sky: [string, string, string]
    halo: string
    haloOpacity: number
    /** The sun's disc; the night has a crescent instead. */
    sun: [string, string] | null
    text: string
    border: string
    button: string
    onButton: string
  }
> = {
  morning: {
    icon: Sunrise,
    sky: ["#fff3dc", "#fbd6ac", "#f3b49b"],
    halo: "#ffb85c",
    haloOpacity: 0.7,
    sun: ["#ffd98a", "#ff9f5a"],
    text: brand.night,
    border: "rgba(16, 40, 74, 0.1)",
    button: brand.night,
    onButton: brand.cream,
  },
  day: {
    icon: Sun,
    sky: ["#eef7fe", "#cfe8fa", "#abd6f5"],
    halo: "#fff1a8",
    haloOpacity: 1,
    sun: ["#fff3ad", "#ffd23f"],
    text: brand.night,
    border: "rgba(16, 40, 74, 0.1)",
    button: brand.night,
    onButton: brand.cream,
  },
  night: {
    icon: Moon,
    sky: ["#0b1a33", brand.night, "#22407a"],
    halo: moon,
    haloOpacity: 0.25,
    sun: null,
    text: brand.cream,
    border: "rgba(255, 255, 255, 0.15)",
    button: brand.gold,
    onButton: brand.night,
  },
}

/** A few stars around the text: left and top in percent, size in points. */
const stars: [number, number, number][] = [
  [8, 6, 2],
  [24, 3, 3],
  [41, 8, 2],
  [57, 4, 3],
  [52, 95, 2],
  [36, 92, 3],
]

const haloSize = 260
const bodySize = 36

/**
 * The verse of the day at the top of Today, the same as on the web and in the
 * meditation reminder, read offline in the version of the phone. Nothing is
 * shown when the day has no verse.
 */
export function VerseOfTheDay({
  today,
  version,
  timeZone,
}: {
  today: IsoDate
  version: BibleVersionId
  timeZone: string | null
}) {
  const t = useTranslations("VerseOfTheDay")
  const locale = useLocale() as Locale
  const period = useSyncExternalStore(subscribe, () => currentPeriod(timeZone))
  const passage = findVerseOfTheDay(today, locale)
  const state = usePassage(passage, version)
  if (!passage) return null

  const look = looks[period]
  const Icon = look.icon
  const reference = formatPassage(passage, locale)
  const verses =
    state.status === "ready"
      ? state.text.chapters.flatMap(({ verses }) => verses)
      : []
  const open = () => {
    haptics.press()
    router.push({
      pathname: "/read/[passage]",
      params: { passage: toPassageSlug(passage) },
    })
  }

  return (
    <View style={[styles.card, { borderColor: look.border }]}>
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="verse-sky" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={look.sky[0]} />
              <Stop offset="0.55" stopColor={look.sky[1]} />
              <Stop offset="1" stopColor={look.sky[2]} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#verse-sky)" />
        </Svg>
        {period === "night"
          ? stars.map(([left, top, size]) => (
              <View
                key={`${left}-${top}`}
                style={[
                  styles.star,
                  {
                    left: `${left}%`,
                    top: `${top}%`,
                    width: size,
                    height: size,
                  },
                ]}
              />
            ))
          : null}
        <Svg width={haloSize} height={haloSize} style={styles.halo}>
          <Defs>
            <RadialGradient id="verse-halo" cx="0.5" cy="0.5" r="0.5">
              <Stop
                offset="0"
                stopColor={look.halo}
                stopOpacity={look.haloOpacity}
              />
              <Stop offset="1" stopColor={look.halo} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle
            cx={haloSize / 2}
            cy={haloSize / 2}
            r={haloSize / 2}
            fill="url(#verse-halo)"
          />
        </Svg>
        <Svg width={bodySize} height={bodySize} style={styles.body}>
          <Defs>
            <LinearGradient id="verse-sun" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={look.sun?.[0] ?? moon} />
              <Stop offset="1" stopColor={look.sun?.[1] ?? moon} />
            </LinearGradient>
            <Mask id="verse-crescent">
              <Rect width={bodySize} height={bodySize} fill="#000" />
              <Circle cx={18} cy={18} r={16} fill="#fff" />
              <Circle cx={11} cy={13} r={14} fill="#000" />
            </Mask>
          </Defs>
          <Circle
            cx={18}
            cy={18}
            r={16}
            fill="url(#verse-sun)"
            mask={look.sun ? undefined : "url(#verse-crescent)"}
          />
        </Svg>
      </View>

      <View style={styles.head}>
        <Icon size={16} color={look.text} />
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: look.text }]}
        >
          {t("title")}
        </Text>
      </View>

      {verses.length > 0 ? (
        <View>
          <Text
            style={[styles.mark, { color: look.text }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            “
          </Text>
          <Text style={[styles.verse, { color: look.text }]}>
            {verses.map(([number, words], index) => (
              <Text key={number}>
                {index > 0 ? " " : ""}
                {displayVerse(version, words).segments.map((segment, part) => (
                  <Text
                    key={part}
                    style={segment.italic ? styles.italic : undefined}
                  >
                    {segment.text}
                  </Text>
                ))}
              </Text>
            ))}
          </Text>
        </View>
      ) : null}

      <View style={styles.foot}>
        <View style={styles.reference}>
          <View style={[styles.dash, { backgroundColor: look.text }]} />
          <Text style={[styles.referenceText, { color: look.text }]}>
            {reference}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t("read")}, ${reference}`}
          onPress={open}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: look.button },
            pressed && styles.pressed,
          ]}
        >
          <BookOpen size={16} color={look.onButton} />
          <Text style={[styles.buttonLabel, { color: look.onButton }]}>
            {t("read")}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    padding: spacing.lg,
    gap: spacing.md,
  },
  star: {
    position: "absolute",
    borderRadius: radius.pill,
    backgroundColor: moon,
    opacity: 0.75,
  },
  halo: {
    position: "absolute",
    top: -haloSize / 2 + spacing.lg + bodySize / 2,
    right: -haloSize / 2 + spacing.lg + bodySize / 2,
  },
  body: { position: "absolute", top: spacing.lg - 6, right: spacing.lg },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: {
    ...typography.label,
    fontFamily: fontFamily.semibold,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    opacity: 0.7,
  },
  mark: {
    fontFamily: fontFamily.heading,
    fontSize: 52,
    lineHeight: 52,
    height: 28,
    opacity: 0.3,
  },
  verse: { fontFamily: fontFamily.scripture, fontSize: 20, lineHeight: 30 },
  italic: { fontFamily: fontFamily.scriptureItalic },
  foot: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  reference: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dash: { width: 20, height: StyleSheet.hairlineWidth * 2, opacity: 0.5 },
  referenceText: {
    fontFamily: fontFamily.heading,
    fontSize: 16,
    lineHeight: 22,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  pressed: { opacity: 0.8, transform: [{ translateY: 1 }] },
  buttonLabel: { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 20 },
})
