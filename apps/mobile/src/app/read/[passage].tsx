import { formatPassage, parsePassageSlug } from "@workspace/core"
import { Stack, useLocalSearchParams } from "expo-router"
import { useLocale, useTranslations } from "use-intl"

import { Body, Screen } from "@/components/screen"

/** A passage opened from a link, e.g. bibleplan://read/John.3 */
export default function ReadScreen() {
  const { passage: slug } = useLocalSearchParams<{ passage: string }>()
  const t = useTranslations("Mobile.read")
  const locale = useLocale()
  const passage = parsePassageSlug(slug)
  const title = passage ? formatPassage(passage, locale) : t("notFound")
  return (
    <>
      <Stack.Screen options={{ title }} />
      <Screen title={title}>
        {!passage && <Body>{t("invalid", { slug })}</Body>}
      </Screen>
    </>
  )
}
