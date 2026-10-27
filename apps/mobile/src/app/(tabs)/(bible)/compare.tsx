import { formatPassage, isBookId, type Passage } from "@workspace/core"
import { Redirect, Stack, useLocalSearchParams } from "expo-router"
import { ActivityIndicator } from "react-native"
import { useLocale, useTranslations } from "use-intl"

import type { BundledVersion } from "@/bible/texts"
import { usePassage } from "@/bible/use-passage"
import { ChapterText } from "@/components/bible/chapter-text"
import { Body, TabScreen } from "@/components/screen"
import { Card } from "@/components/ui/card"
import { usePreferences } from "@/lib/preferences"
import { bibleVersionIds, bibleVersionNames } from "@/repositories/profile"
import { useColors } from "@/theme/use-colors"

/**
 * The selected verses in every bundled version, one under the other, each in
 * its own numbering (e.g. bibleplan://compare?book=John&chapter=3&from=16&to=17,
 * verses of the canon).
 */
export default function CompareScreen() {
  const params = useLocalSearchParams<{
    book: string
    chapter: string
    from: string
    to: string
  }>()
  const t = useTranslations("Reader.selection")
  const locale = useLocale()
  const chapter = Number(params.chapter)
  const from = Number(params.from)
  const to = Number(params.to)
  if (!isBookId(params.book) || !(chapter >= 1 && from >= 1 && to >= from)) {
    return <Redirect href="/bible" />
  }
  const passage: Passage = {
    book: params.book,
    start: { chapter, verse: from },
    end: { chapter, verse: to },
  }
  return (
    <>
      <Stack.Screen
        options={{
          title: `${t("compare")} · ${formatPassage(passage, locale)}`,
        }}
      />
      <TabScreen>
        {bibleVersionIds.map((version) => (
          <VersionCard key={version} passage={passage} version={version} />
        ))}
      </TabScreen>
    </>
  )
}

function VersionCard({
  passage,
  version,
}: {
  passage: Passage
  version: BundledVersion
}) {
  const colors = useColors()
  const t = useTranslations("Reader")
  const { reader } = usePreferences()
  const state = usePassage(passage, version)
  return (
    <Card title={bibleVersionNames[version]}>
      {state.status === "ready" ? (
        <ChapterText
          version={version}
          verses={state.text.chapters.flatMap(({ verses }) => verses)}
          look={reader}
        />
      ) : state.status === "error" ? (
        <Body>{t("loadFailed")}</Body>
      ) : (
        <ActivityIndicator color={colors.accent} />
      )}
    </Card>
  )
}
