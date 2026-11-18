import type { UseQueryResult } from "@tanstack/react-query"
import { router } from "expo-router"
import { CircleAlert, CircleUserRound, WifiOff } from "lucide-react-native"
import type { ReactNode } from "react"
import { ActivityIndicator } from "react-native"
import { useTranslations } from "use-intl"

import { Body } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Notice } from "@/components/ui/notice"
import { ApiError } from "@/lib/api"
import { useColors } from "@/theme/use-colors"

/** Groups need an account: what to show to somebody without one. */
export function SignedOutCard() {
  const t = useTranslations("Mobile")
  return (
    <Card title={t("groups.signedOutTitle")}>
      <Body>{t("groups.signedOut")}</Body>
      <Button
        title={t("account.open")}
        icon={CircleUserRound}
        onPress={() => router.push("/settings/account")}
      />
    </Card>
  )
}

/**
 * What a server answer looks like while it comes: a spinner the first time,
 * a message when it failed with nothing known, and a note above the last
 * known state when the phone is offline.
 */
export function QueryState<T>({
  query,
  children,
  section = false,
}: {
  query: UseQueryResult<T>
  children: (data: T) => ReactNode
  /** A part of a screen: the screen already says it is offline. */
  section?: boolean
}) {
  const t = useTranslations()
  const colors = useColors()
  const { data, error, fetchStatus } = query
  const offline =
    fetchStatus === "paused" ||
    (error instanceof ApiError && error.code === "offline")
  if (data === undefined) {
    if (error) {
      const code = error instanceof ApiError ? error.code : "unexpected"
      return (
        <Notice icon={offline ? WifiOff : CircleAlert}>
          {offline
            ? t("Mobile.groups.offlineEmpty")
            : code === "notFound"
              ? t("Groups.errors.notFound")
              : t("Groups.errors.unexpected")}
        </Notice>
      )
    }
    if (offline) {
      return <Notice icon={WifiOff}>{t("Mobile.groups.offlineEmpty")}</Notice>
    }
    return <ActivityIndicator color={colors.foreground} />
  }
  return (
    <>
      {offline && !section ? (
        <Notice icon={WifiOff}>{t("Mobile.groups.offline")}</Notice>
      ) : null}
      {children(data)}
    </>
  )
}
