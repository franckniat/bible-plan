import { normalizeInviteCode } from "@workspace/core"
import { router } from "expo-router"
import { UserPlus } from "lucide-react-native"
import { useState } from "react"
import { useTranslations } from "use-intl"

import { Body } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

/**
 * Joining with a code received by message: it opens the invitation, which
 * shows the group before joining it.
 */
export function JoinByCode() {
  const t = useTranslations("Groups")
  const [code, setCode] = useState("")
  const [invalid, setInvalid] = useState(false)
  const open = () => {
    const normalized = normalizeInviteCode(code)
    setInvalid(normalized === null)
    if (normalized) {
      router.push({ pathname: "/join/[code]", params: { code: normalized } })
    }
  }
  return (
    <Card title={t("join.title")}>
      <Body>{t("join.description")}</Body>
      <Input
        label={t("join.label")}
        placeholder={t("join.placeholder")}
        value={code}
        onChangeText={(text) => {
          setCode(text)
          setInvalid(false)
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={open}
        error={invalid ? t("errors.invalidCode") : undefined}
      />
      <Button
        title={t("join.submit")}
        icon={UserPlus}
        variant="outline"
        disabled={!code.trim()}
        onPress={open}
      />
    </Card>
  )
}
