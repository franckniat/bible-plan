import { formatInviteCode, normalizeInviteCode } from "@workspace/core"
import { useLocalSearchParams } from "expo-router"

import { Body, Screen } from "@/components/screen"

/** A group invitation, e.g. bibleplan://join/ABCD2345 */
export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>()
  const normalized = normalizeInviteCode(code)
  if (!normalized) {
    return (
      <Screen title="Invitation invalide">
        <Body>
          Le code « {code} » n&apos;est pas un code d&apos;invitation.
        </Body>
      </Screen>
    )
  }
  return (
    <Screen title={formatInviteCode(normalized)}>
      <Body>Les groupes arrivent bientôt dans l&apos;application.</Body>
    </Screen>
  )
}
