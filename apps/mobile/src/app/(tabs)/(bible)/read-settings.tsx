import type { Passage } from "@workspace/core"
import { Stack } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { useLocale, useTranslations } from "use-intl"

import { usePassage } from "@/bible/use-passage"
import { ChapterText } from "@/components/bible/chapter-text"
import { ChoiceList } from "@/components/choice-list"
import { TabScreen } from "@/components/screen"
import { Card } from "@/components/ui/card"
import { Segmented } from "@/components/ui/segmented"
import { SwitchRow } from "@/components/ui/switch-row"
import { setPreferences, usePreferences } from "@/lib/preferences"
import {
  bibleVersionIds,
  bibleVersionNames,
  bibleVersionOf,
  setProfile,
  useProfile,
} from "@/repositories/profile"
import { spacing, typography } from "@/theme/metrics"
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
  const locale = useLocale()
  const colors = useColors()
  const { reader } = usePreferences()
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
      <Stack.Screen
        options={{ title: t("settings.title"), presentation: "formSheet" }}
      />
      <TabScreen>
        <Card>
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

        <View style={styles.field}>
          {label(t("version"))}
          <ChoiceList
            options={bibleVersionIds.map((id) => ({
              value: id,
              label: bibleVersionNames[id],
            }))}
            value={version}
            onChange={(bibleVersion) => setProfile({ bibleVersion })}
          />
        </View>
      </TabScreen>
    </>
  )
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
})
