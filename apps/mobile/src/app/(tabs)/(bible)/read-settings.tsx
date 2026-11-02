import type { Passage } from "@workspace/core"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useLocale, useTranslations } from "use-intl"

import { usePassage } from "@/bible/use-passage"
import { ChapterText } from "@/components/bible/chapter-text"
import { TabScreen } from "@/components/screen"
import { Card } from "@/components/ui/card"
import { Segmented } from "@/components/ui/segmented"
import { SwitchRow } from "@/components/ui/switch-row"
import { lineHeights, setPreferences, usePreferences } from "@/lib/preferences"
import { bibleVersionOf, useProfile } from "@/repositories/profile"
import { spacing, typography } from "@/theme/metrics"
import {
  dayBackgrounds,
  nightBackgrounds,
  useReaderBackground,
} from "@/theme/reader-backgrounds"
import { useColors } from "@/theme/use-colors"

const sizes = [0, 1, 2, 3] as const

/** The sample read with the chosen look: John 3:16. */
const sample: Passage = {
  book: "John",
  start: { chapter: 3, verse: 16 },
  end: { chapter: 3, verse: 16 },
}

/** How the reader shows the text, with a sample verse (as on the web). */
export default function ReaderSettingsScreen() {
  const t = useTranslations("Reader")
  const tMobile = useTranslations("Mobile.read")
  const locale = useLocale()
  const colors = useColors()
  const tTheme = useTranslations("Theme")
  const { reader, theme } = usePreferences()
  const background = useReaderBackground()
  const profile = useProfile()
  const version = bibleVersionOf(profile.bibleVersion, locale)
  const verse = usePassage(sample, version)
  const set = (change: Partial<typeof reader>) =>
    setPreferences({ reader: { ...reader, ...change } })
  const label = (text: string) => (
    <Text style={[typography.h3, { color: colors.foreground }]}>{text}</Text>
  )

  return (
    <>
      <TabScreen>
        {/* A sheet has no header: its title is at the top of it. */}
        <Text
          accessibilityRole="header"
          style={[
            typography.h3,
            { color: colors.foreground, textAlign: "center" },
          ]}
        >
          {t("settings.title")}
        </Text>
        <Card style={{ backgroundColor: background }}>
          <ChapterText
            version={version}
            verses={
              verse.status === "ready"
                ? verse.text.chapters.flatMap(({ verses }) => verses)
                : []
            }
            look={reader}
          />
        </Card>

        <View style={styles.field}>
          {label(tTheme("label"))}
          <Segmented
            value={theme}
            options={(["system", "light", "dark"] as const).map((value) => ({
              value,
              label: tTheme(value),
            }))}
            onChange={(value) => setPreferences({ theme: value })}
          />
        </View>

        <View style={styles.field}>
          {label(tMobile("dayBackground"))}
          <Swatches
            colors={dayBackgrounds}
            value={reader.dayBackground}
            onChange={(dayBackground) => set({ dayBackground })}
          />
        </View>

        <View style={styles.field}>
          {label(tMobile("nightBackground"))}
          <Swatches
            colors={nightBackgrounds}
            value={reader.nightBackground}
            onChange={(nightBackground) => set({ nightBackground })}
          />
        </View>

        <View style={styles.field}>
          {label(tMobile("font"))}
          <Segmented
            value={reader.font}
            options={[
              { value: "lora", label: "Lora" },
              { value: "geist", label: "Geist" },
            ]}
            onChange={(font) => set({ font })}
          />
        </View>

        <View style={styles.field}>
          {label(t("settings.size"))}
          <Segmented
            value={String(reader.size)}
            options={sizes.map((size) => ({
              value: String(size),
              label: t(`settings.sizes.${size}`),
            }))}
            onChange={(size) =>
              set({ size: Number(size) as typeof reader.size })
            }
          />
        </View>

        <View style={styles.field}>
          {label(tMobile("lineHeight"))}
          <Segmented
            value={reader.lineHeight}
            options={lineHeights.map((lineHeight) => ({
              value: lineHeight,
              label: tMobile(`lineHeights.${lineHeight}`),
            }))}
            onChange={(lineHeight) => set({ lineHeight })}
          />
        </View>

        <View style={styles.field}>
          {label(t("settings.layout"))}
          <Segmented
            value={reader.layout}
            options={[
              { value: "flow", label: t("settings.layouts.flow") },
              { value: "lines", label: t("settings.layouts.lines") },
            ]}
            onChange={(layout) => set({ layout })}
          />
        </View>

        <Card padded={false}>
          <SwitchRow
            label={t("settings.verseNumbers")}
            value={reader.verseNumbers}
            onValueChange={(verseNumbers) => set({ verseNumbers })}
            last
          />
        </Card>
      </TabScreen>
    </>
  )
}

/** A choice of colors, as round swatches; the one chosen is ringed. */
function Swatches<T extends string>({
  colors: choices,
  value,
  onChange,
}: {
  colors: Record<T, string>
  value: T
  onChange: (value: T) => void
}) {
  const tMobile = useTranslations("Mobile.read.backgrounds")
  const colors = useColors()
  return (
    <View style={{ flexDirection: "row", gap: spacing.md }}>
      {(Object.keys(choices) as T[]).map((key) => (
        <Pressable
          key={key}
          accessibilityRole="radio"
          accessibilityLabel={tMobile(key as "cream")}
          accessibilityState={{ selected: key === value }}
          hitSlop={6}
          onPress={() => onChange(key)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: choices[key],
            borderWidth: key === value ? 3 : 1,
            borderColor: key === value ? colors.accent : colors.border,
          }}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
})
