import { formatInviteCode, normalizeInviteCode } from "@workspace/core"
import { useLocalSearchParams } from "expo-router"
import { useTranslations } from "use-intl"

import { Body, Screen } from "@/components/screen"

/** A group invitation, e.g. bibleplan://join/ABCD2345 */
export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>()
  const t = useTranslations("Mobile.join")
  const normalized = normalizeInviteCode(code)
  if (!normalized) {
    return (
      <Screen title={t("invalidTitle")}>
        <Body>{t("invalid", { code })}</Body>
      </Screen>
    )
  }
  return (
    <Screen title={formatInviteCode(normalized)}>
      <Body>{t("soon")}</Body>
    </Screen>
  )
}
