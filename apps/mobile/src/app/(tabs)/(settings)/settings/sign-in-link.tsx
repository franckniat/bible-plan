import { router, useLocalSearchParams } from "expo-router"
import { useEffect } from "react"
import { ActivityIndicator, View } from "react-native"

import { adoptSession } from "@/lib/auth-client"
import { haptics } from "@/lib/haptics"
import { useColors } from "@/theme/use-colors"

/**
 * Where an email's sign-in link opens the app: the session it brings is
 * kept, then Settings shows the account. A link no longer valid goes back
 * to the account screen, which says so.
 */
export default function SignInLinkScreen() {
  const colors = useColors()
  const { cookie, error } = useLocalSearchParams<{
    cookie?: string
    error?: string
  }>()

  useEffect(() => {
    let current = true
    const failed = () =>
      router.replace({
        pathname: "/settings/account",
        params: { link: "invalid" },
      })
    if (!cookie || error) {
      failed()
      return
    }
    adoptSession(cookie)
      .then(() => {
        if (!current) return
        haptics.success()
        router.replace("/settings")
      })
      .catch(() => current && failed())
    return () => {
      current = false
    }
  }, [cookie, error])

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator color={colors.foreground} />
    </View>
  )
}
